import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)

    const recentJobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        status: true,
        totalChars: true,
        durationMinutes: true,
        typingProfile: true,
        createdAt: true,
        completedAt: true,
        errorCode: true,
        user: { select: { email: true } },
      },
    })

    return NextResponse.json({
      jobs: recentJobs.map((j) => ({
        id: j.id,
        userId: j.userId,
        email: j.user?.email ?? null,
        status: j.status,
        totalChars: j.totalChars,
        durationMinutes: j.durationMinutes,
        typingProfile: j.typingProfile,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
        errorCode: j.errorCode,
      })),
    })
  } catch (error: unknown) {
    console.error("[ADMIN ACTIVITY]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch activity" },
      { status: 500 }
    )
  }
}
