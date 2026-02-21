import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
    })
    return NextResponse.json(announcements)
  } catch (error: unknown) {
    logger.error("[API] GET /api/announcements error:", error)
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
  }
}
