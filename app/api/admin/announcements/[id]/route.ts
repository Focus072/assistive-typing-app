import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { patchAnnouncementSchema } from "@/lib/schemas/announcements"

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
    const parsed = patchAnnouncementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.published !== undefined) {
      data.publishedAt = parsed.data.published ? new Date() : null
    }
    const updated = await prisma.announcement.update({ where: { id }, data })
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
