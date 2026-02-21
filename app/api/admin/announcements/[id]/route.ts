import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.content !== undefined) data.content = body.content
    if (body.badge !== undefined) data.badge = body.badge
    if (body.published !== undefined) {
      data.published = body.published
      data.publishedAt = body.published ? new Date() : null
    }
    const updated = await prisma.announcement.update({
      where: { id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    logger.error("[API] PATCH /api/admin/announcements/[id] error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  try {
    await prisma.announcement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error("[API] DELETE /api/admin/announcements/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
