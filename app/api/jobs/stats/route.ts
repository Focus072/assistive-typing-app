import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "30d"

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (range) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0) // All time
    }

    // Get all jobs in range
    const jobs = await prisma.job.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: startDate },
      },
      select: {
        totalChars: true,
        currentIndex: true,
        durationMinutes: true,
        typingProfile: true,
        status: true,
        createdAt: true,
      },
    })

    // Calculate stats
    const totalJobs = jobs.length
    const totalChars = jobs.reduce((sum, job) => sum + job.currentIndex, 0)
    const completedJobs = jobs.filter(j => j.status === "completed").length
    const failedJobs = jobs.filter(j => j.status === "failed").length
    
    // Calculate average WPM
    const totalMinutes = jobs.reduce((sum, job) => sum + job.durationMinutes, 0)
    const avgWPM = totalMinutes > 0 && totalChars > 0
      ? Math.round((totalChars / 5) / (totalMinutes / jobs.length))
      : 0

    // Jobs by profile
    const jobsByProfile: Record<string, number> = {}
    jobs.forEach(job => {
      const profile = job.typingProfile || "unknown"
      jobsByProfile[profile] = (jobsByProfile[profile] || 0) + 1
    })

    // Jobs by day
    const jobsByDayMap: Record<string, number> = {}
    jobs.forEach(job => {
      const date = job.createdAt.toISOString().split("T")[0]
      jobsByDayMap[date] = (jobsByDayMap[date] || 0) + 1
    })
    
    const jobsByDay = Object.entries(jobsByDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      totalJobs,
      totalChars,
      totalTime: totalMinutes,
      avgWPM,
      completedJobs,
      failedJobs,
      jobsByProfile,
      jobsByDay,
    })
  } catch (error: unknown) {
    logger.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}




