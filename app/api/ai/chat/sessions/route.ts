import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const allowed = session.user.planTier === "UNLIMITED" || session.user.role === "ADMIN"
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { _count: { select: { messages: true } } },
    })

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        pinned: s.pinned,
        folder: s.folder ?? null,
        updatedAt: s.updatedAt.toISOString(),
        messageCount: s._count.messages,
      })),
    })
  } catch (error) {
    logger.error("[API] GET /api/ai/chat/sessions error:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}
