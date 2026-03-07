import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000)

    // Jobs per day (last 30 days)
    const jobsPerDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Job"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `

    // Success rate per day (last 30 days)
    const successRateRaw = await prisma.$queryRaw<Array<{ date: string; total: bigint; completed: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM "Job"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `

    // Users per week (last 12 weeks)
    const usersPerWeek = await prisma.$queryRaw<Array<{ week: string; count: bigint }>>`
      SELECT DATE_TRUNC('week', "createdAt") as week, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${twelveWeeksAgo}
      GROUP BY DATE_TRUNC('week', "createdAt")
      ORDER BY week
    `

    // Profile distribution
    const profileDistribution = await prisma.$queryRaw<Array<{ typingProfile: string; count: bigint }>>`
      SELECT "typingProfile", COUNT(*) as count
      FROM "Job"
      GROUP BY "typingProfile"
      ORDER BY count DESC
    `

    // Completed vs Failed per day (last 7 days) for dashboard line chart
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const completedVsFailed = await prisma.$queryRaw<Array<{ date: string; completed: bigint; failed: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM "Job"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `

    return NextResponse.json({
      jobsPerDay: jobsPerDay.map(r => ({ date: r.date, count: Number(r.count) })),
      completedVsFailed: completedVsFailed.map(r => ({
        date: r.date,
        completed: Number(r.completed),
        failed: Number(r.failed),
      })),
      successRatePerDay: successRateRaw.map(r => ({
        date: r.date,
        rate: Number(r.total) > 0 ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
      })),
      usersPerWeek: usersPerWeek.map(r => ({ week: r.week, count: Number(r.count) })),
      profileDistribution: profileDistribution.map(r => ({ profile: r.typingProfile, count: Number(r.count) })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
