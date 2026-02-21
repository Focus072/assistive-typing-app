import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserLimits, PlanTier } from "@/lib/constants/tiers"
import { logger } from "@/lib/logger"
import { getFreeTierOverrides } from "@/lib/settings"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch user's planTier from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { planTier: true },
    })

    const userTier: PlanTier = user?.planTier || 'FREE'
    let limits = getUserLimits(userTier)
    if (userTier === "FREE") {
      const overrides = await getFreeTierOverrides()
      if (overrides.maxJobHistory != null) limits = { ...limits, maxJobHistory: overrides.maxJobHistory }
    }

    // Determine history limit
    const historyLimit = limits.maxJobHistory === null ? 10000 : limits.maxJobHistory

    const jobs = await prisma.job.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: historyLimit,
      select: {
        id: true,
        documentId: true,
        totalChars: true,
        currentIndex: true,
        durationMinutes: true,
        typingProfile: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        errorCode: true,
      },
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      logger.error("Error fetching jobs:", error)
    }
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    )
  }
}


