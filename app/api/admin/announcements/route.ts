import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return null
  }
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(announcements)
  } catch (error: unknown) {
    logger.error("[API] GET /api/admin/announcements error:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { title, content, badge } = await req.json()
    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 })
    }
    const announcement = await prisma.announcement.create({
      data: { title, content, badge: badge || "Update" },
    })
    return NextResponse.json(announcement, { status: 201 })
  } catch (error: unknown) {
    logger.error("[API] POST /api/admin/announcements error:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
