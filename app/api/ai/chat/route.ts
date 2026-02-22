import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { logger } from "@/lib/logger"

const messageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(10000),
      })
    )
    .min(1)
    .max(50),
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

const SYSTEM_PROMPT =
  "You are a helpful writing assistant. Help users write, edit, improve, and brainstorm text for their documents. Be concise and practical."

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.planTier !== "UNLIMITED") {
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

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: parsed.data.messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
                )
              )
            }
          }
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
      },
    })
  } catch (error: unknown) {
    logger.error("[API] POST /api/ai/chat error:", error)
    return NextResponse.json({ error: "AI request failed" }, { status: 500 })
  }
}
