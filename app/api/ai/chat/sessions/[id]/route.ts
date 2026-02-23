import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  pinned: z.boolean().optional(),
  folder: z.string().max(50).nullable().optional(),
})

async function resolveSession(params: Promise<{ id: string }> | { id: string }) {
  return Promise.resolve(params)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await getServerSession(authOptions)
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await resolveSession(params)

  try {
    const chatSession = await prisma.chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { order: "asc" } } },
    })

    if (!chatSession) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (chatSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      session: {
        id: chatSession.id,
        title: chatSession.title,
        pinned: chatSession.pinned,
        folder: chatSession.folder ?? null,
        messages: chatSession.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          feedback: m.feedback ?? null,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    logger.error("[API] GET /api/ai/chat/sessions/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await getServerSession(authOptions)
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await resolveSession(params)

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
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

    const data: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) data.title = parsed.data.title
    if (parsed.data.pinned !== undefined) data.pinned = parsed.data.pinned
    if (parsed.data.folder !== undefined) data.folder = parsed.data.folder

    await prisma.chatSession.update({ where: { id }, data })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("[API] PATCH /api/ai/chat/sessions/[id] error:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await getServerSession(authOptions)
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await resolveSession(params)

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

    await prisma.chatSession.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("[API] DELETE /api/ai/chat/sessions/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
