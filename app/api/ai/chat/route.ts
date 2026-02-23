import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

const MODES = ["default", "coach", "editor", "grammar", "brainstorm"] as const
type Mode = (typeof MODES)[number]

const SYSTEM_PROMPTS: Record<Mode, string> = {
  default:
    "You are a helpful writing assistant. Help users write, edit, improve, and brainstorm text for their documents. Be concise and practical.",
  coach:
    "You are an encouraging writing coach. Help users develop their writing skills by providing constructive feedback, explaining techniques, and guiding them to find their own voice. Be supportive and educational.",
  editor:
    "You are a professional essay editor. Focus on structure, argumentation, clarity, and academic tone. Provide specific suggestions to strengthen arguments and improve coherence. Be precise and analytical.",
  grammar:
    "You are a grammar and style expert. Focus on identifying and correcting grammar, punctuation, spelling, and style issues. Explain each correction briefly. Be thorough and precise.",
  brainstorm:
    "You are a creative brainstorming partner. Help users generate ideas, explore possibilities, and think outside the box. Offer diverse perspectives and creative suggestions. Be imaginative and generative.",
}

const imageSourceSchema = z.object({
  type: z.literal("base64"),
  media_type: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
  data: z.string().max(5_000_000), // ~3.7 MB base64
})

const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1).max(10000) }),
  z.object({ type: z.literal("image"), source: imageSourceSchema }),
])

const messageContentSchema = z.union([
  z.string().min(1).max(10000),
  z.array(contentBlockSchema).min(1).max(10),
])

const messageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: messageContentSchema,
      })
    )
    .min(1)
    .max(50),
  sessionId: z.string().cuid().optional(),
  mode: z.enum(MODES).optional(),
  context: z.string().max(10000).optional(),
  regenerating: z.boolean().optional(),
})

function buildDailyLimiter() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.fixedWindow(50, "24 h"),
    prefix: "rl:ai-chat",
  })
}

const dailyLimiter = buildDailyLimiter()
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Serialise content for DB storage (images become JSON) */
function serializeContent(content: string | z.infer<typeof contentBlockSchema>[]): string {
  if (typeof content === "string") return content
  return JSON.stringify(content)
}

/** Extract plain text for session title generation */
function extractText(content: string | z.infer<typeof contentBlockSchema>[]): string {
  if (typeof content === "string") return content
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join(" ")
}

/** Convert client message content to Anthropic SDK format */
function toAnthropicContent(
  content: string | z.infer<typeof contentBlockSchema>[]
): string | Anthropic.MessageParam["content"] {
  if (typeof content === "string") return content
  return content.map((block) => {
    if (block.type === "text") return { type: "text" as const, text: block.text }
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: block.source.media_type,
        data: block.source.data,
      },
    }
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const allowed = session.user.planTier === "UNLIMITED" || session.user.role === "ADMIN"
  if (!allowed) {
    return NextResponse.json(
      { error: "AI Chat is available to Unlimited members only." },
      { status: 403 }
    )
  }

  let remaining = 50
  if (dailyLimiter) {
    const result = await dailyLimiter.limit(session.user.id)
    if (!result.success) {
      return NextResponse.json(
        { error: "Daily limit reached (50 messages/day). Resets at midnight UTC." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      )
    }
    remaining = result.remaining
  }

  const body = await req.json()
  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { messages, sessionId: incomingSessionId, mode, context, regenerating } = parsed.data
  const basePrompt = SYSTEM_PROMPTS[mode ?? "default"]
  const systemPrompt = context?.trim()
    ? `${basePrompt}\n\nDocument context provided by the user:\n${context.trim()}`
    : basePrompt

  // Resolve or create chat session (best-effort — don't block the stream)
  let chatSessionId: string | null = incomingSessionId ?? null
  try {
    if (!chatSessionId) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
      const rawText = lastUserMsg ? extractText(lastUserMsg.content) : "New Chat"
      const title = rawText.slice(0, 60)
      const newSession = await prisma.chatSession.create({
        data: { userId: session.user.id, title },
      })
      chatSessionId = newSession.id
    }
    // Save incoming user message (skip on regenerate — it's already in DB)
    const userMsg = messages[messages.length - 1]
    if (userMsg.role === "user" && !regenerating) {
      await prisma.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: userMsg.role,
          content: serializeContent(userMsg.content),
          order: messages.length - 1,
        },
      })
    }
  } catch (err) {
    logger.error("[API] chat session/message create error:", err)
    // Non-fatal — stream continues even if DB write fails
  }

  const sessionIdForHeader = chatSessionId ?? ""

  // Convert messages to Anthropic format
  const anthropicMessages: Anthropic.MessageParam[] = parsed.data.messages
    .filter((m) => {
      const text = extractText(m.content)
      return text.trim().length > 0 || (Array.isArray(m.content) && m.content.some((b) => b.type === "image"))
    })
    .map((m) => ({
      role: m.role,
      content: toAnthropicContent(m.content),
    }))

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = ""
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              fullText += chunk.delta.text
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
                )
              )
            }
          }
          // Persist assistant reply BEFORE sending [DONE] so fetchSessions() sees it immediately
          if (chatSessionId && fullText) {
            try {
              await prisma.chatMessage.create({
                data: {
                  sessionId: chatSessionId,
                  role: "assistant",
                  content: fullText,
                  order: messages.length,
                },
              })
              await prisma.chatSession.update({
                where: { id: chatSessionId },
                data: { updatedAt: new Date() },
              })
            } catch (err) {
              logger.error("[API] chat assistant message save error:", err)
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "AI request failed. Please try again."
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-RateLimit-Remaining": String(remaining),
        "X-Session-Id": sessionIdForHeader,
      },
    })
  } catch (error: unknown) {
    logger.error("[API] POST /api/ai/chat error:", error)
    return NextResponse.json({ error: "AI request failed" }, { status: 500 })
  }
}
