import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { z } from "zod"

const truncateSchema = z.object({
  keepCount: z.number().int().min(0),
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
  const parsed = truncateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
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

    await prisma.chatMessage.deleteMany({
      where: { sessionId: id, order: { gte: parsed.data.keepCount } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("[API] POST /api/ai/chat/sessions/[id]/truncate error:", error)
    return NextResponse.json({ error: "Failed to truncate session" }, { status: 500 })
  }
}
