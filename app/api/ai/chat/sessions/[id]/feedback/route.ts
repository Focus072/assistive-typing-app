import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { z } from "zod"

const feedbackSchema = z.object({
  messageId: z.string().cuid(),
  feedback: z.enum(["up", "down"]).nullable(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await getServerSession(authOptions)
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  const body = await req.json().catch(() => ({}))
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    // Verify session ownership
    const chatSession = await prisma.chatSession.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!chatSession) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (chatSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.chatMessage.update({
      where: { id: parsed.data.messageId },
      data: { feedback: parsed.data.feedback },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("[API] POST /api/ai/chat/sessions/[id]/feedback error:", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }
}
