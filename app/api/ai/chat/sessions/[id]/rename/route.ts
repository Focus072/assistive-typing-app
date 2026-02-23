import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await getServerSession(authOptions)
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  try {
    const chatSession = await prisma.chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { order: "asc" }, take: 4 } },
    })

    if (!chatSession) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (chatSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const conversationSnippet = chatSession.messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 250)}`)
      .join("\n")

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Generate a concise 3-6 word title for this conversation. Reply with ONLY the title, no punctuation, no quotes.\n\n${conversationSnippet}`,
        },
      ],
    })

    const rawTitle = response.content[0]?.type === "text" ? response.content[0].text.trim() : null
    const title = rawTitle ?? chatSession.title

    await prisma.chatSession.update({ where: { id }, data: { title } })

    return NextResponse.json({ title })
  } catch (error) {
    logger.error("[API] POST /api/ai/chat/sessions/[id]/rename error:", error)
    return NextResponse.json({ error: "Failed to rename session" }, { status: 500 })
  }
}
