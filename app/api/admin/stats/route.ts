import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Check if user is admin (by email)
function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || []
  return adminEmails.includes(email)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // In development, allow fallback admin user
    if (process.env.NODE_ENV === "development" && session?.user?.id === "dev-admin-fallback") {
      // Use fallback stats for development
      return NextResponse.json({
        overview: {
          totalUsers: 0,
          totalJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          totalWaitlist: 0,
          successRate: 0,
        },
        topUser: null,
        recentUsers: [],
        recentJobs: [],
      })
    }

    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get overview statistics
    const [
      totalUsers,
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      totalWaitlist,
      recentUsers,
      recentJobs,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total jobs
      prisma.job.count(),
      
      // Active jobs (running or paused)
      prisma.job.count({
        where: {
          status: {
            in: ["running", "paused"],
          },
        },
      }),
      
      // Completed jobs
      prisma.job.count({
        where: { status: "completed" },
      }),
      
      // Failed jobs
      prisma.job.count({
        where: { status: "failed" },
      }),
      
      // Waitlist count
      prisma.waitlistEmail.count(),
      
      // Recent users (last 7 days)
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      
      // Recent jobs (last 24 hours)
      prisma.job.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          completedAt: true,
          totalChars: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ])

    // Get user with most jobs
    const topUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
        _count: {
          select: { jobs: true },
        },
      },
      orderBy: {
        jobs: {
          _count: "desc",
        },
      },
    })

    // Calculate success rate
    const successRate =
      totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

    return NextResponse.json({
      overview: {
        totalUsers,
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        totalWaitlist,
        successRate,
      },
      topUser: topUser
        ? {
            id: topUser.id,
            email: topUser.email,
            name: topUser.name,
            jobCount: topUser._count.jobs,
          }
        : null,
      recentUsers,
      recentJobs,
    })
  } catch (error: any) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    )
  }
}
