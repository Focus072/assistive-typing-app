import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"
import type { Prisma } from "@prisma/client"

type RecentUser = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    name: true
    image: true
    createdAt: true
    accounts: { select: { provider: true } }
  }
}>

type RecentJob = Prisma.JobGetPayload<{
  select: {
    id: true
    userId: true
    status: true
    createdAt: true
    completedAt: true
    totalChars: true
  }
}>

type TopUser = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    name: true
    _count: { select: { jobs: true } }
  }
}> | null

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin (by email or fallback ID)
    const isFallbackAdmin = session?.user?.id === "admin-fallback" || session?.user?.id === "dev-admin-fallback"
    const isAdminUser = session?.user?.email && isAdminEmail(session.user.email)

    if (!isFallbackAdmin && !isAdminUser) {
      console.warn("[ADMIN] Unauthorized access attempt:", {
        userId: session?.user?.id,
        email: session?.user?.email,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only use fallback stats if it's a fallback admin ID (not just the email)
    // Regular admin users should always try to query the database
    const shouldUseFallback = isFallbackAdmin && !isAdminUser

    // Get overview statistics
    let totalUsers = 0
    let totalJobs = 0
    let activeJobs = 0
    let completedJobs = 0
    let failedJobs = 0
    let googleOAuthUsers = 0
    let credentialUsers = 0
    let totalDocuments = 0
    let activeSubscribers = 0
    let academicIntegrityAcceptedCount = 0
    let recentUsers: RecentUser[] = []
    let recentJobs: RecentJob[] = []
    let topUser: TopUser = null

    // If using fallback admin ID (database unavailable), return empty stats
    if (shouldUseFallback) {
      return NextResponse.json({
        overview: {
          totalUsers: 0,
          totalJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          googleOAuthUsers: 0,
          credentialUsers: 0,
          successRate: 0,
          totalDocuments: 0,
          activeSubscribers: 0,
          academicIntegrityAcceptedCount: 0,
        },
        topUser: null,
        recentUsers: [],
        recentJobs: [],
      })
    }

    // Try to query the database for real stats
    console.log("[ADMIN STATS] Querying database for stats...")
    try {
      // Run queries individually with error handling to see which ones fail
      try {
        totalUsers = await prisma.user.count()
        console.log("[ADMIN STATS] Total users query successful:", totalUsers)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Total users query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        totalJobs = await prisma.job.count()
        console.log("[ADMIN STATS] Total jobs query successful:", totalJobs)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Total jobs query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        activeJobs = await prisma.job.count({
          where: {
            status: {
              in: ["running", "paused"],
            },
          },
        })
        console.log("[ADMIN STATS] Active jobs query successful:", activeJobs)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Active jobs query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        completedJobs = await prisma.job.count({
          where: { status: "completed" },
        })
        console.log("[ADMIN STATS] Completed jobs query successful:", completedJobs)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Completed jobs query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        failedJobs = await prisma.job.count({
          where: { status: "failed" },
        })
        console.log("[ADMIN STATS] Failed jobs query successful:", failedJobs)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Failed jobs query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        googleOAuthUsers = await prisma.user.count({
          where: {
            accounts: {
              some: {
                provider: "google",
              },
            },
          },
        })
        console.log("[ADMIN STATS] Google OAuth users query successful:", googleOAuthUsers)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Google OAuth users query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        credentialUsers = await prisma.user.count({
          where: {
            password: {
              not: null,
            },
          },
        })
        console.log("[ADMIN STATS] Credential users query successful:", credentialUsers)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Credential users query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        totalDocuments = await prisma.document.count()
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Total documents query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        activeSubscribers = await prisma.user.count({
          where: { subscriptionStatus: "active" },
        })
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Active subscribers query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        academicIntegrityAcceptedCount = await prisma.user.count({
          where: { academicIntegrityAcceptedAt: { not: null } },
        })
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Academic integrity count query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        recentUsers = await prisma.user.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            createdAt: true,
            accounts: {
              select: {
                provider: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        console.log("[ADMIN STATS] Recent users query successful, count:", recentUsers.length)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Recent users query failed:", e instanceof Error ? e.message : String(e))
      }

      try {
        recentJobs = await prisma.job.findMany({
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
        })
        console.log("[ADMIN STATS] Recent jobs query successful, count:", recentJobs.length)
      } catch (e: unknown) {
        console.error("[ADMIN STATS] Recent jobs query failed:", e instanceof Error ? e.message : String(e))
      }

      console.log("[ADMIN STATS] Database query successful:", {
        totalUsers,
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        googleOAuthUsers,
        credentialUsers,
        recentUsersCount: recentUsers.length,
        recentJobsCount: recentJobs.length,
      })

      // Get user with most jobs
      topUser = await prisma.user.findFirst({
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
    } catch (dbError: unknown) {
      // If database fails, log the error with full details
      const dbErr = dbError instanceof Error ? dbError : new Error(String(dbError))
      console.error("[ADMIN STATS] Database error:", {
        message: dbErr.message,
        name: dbErr.name,
        stack: dbErr.stack,
      })
      
      // Log what we have so far
      console.error("[ADMIN STATS] Partial results before error:", {
        totalUsers,
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        googleOAuthUsers,
        credentialUsers,
      })
      
      // Don't throw - return empty stats instead so the page can still load
      // The variables are already initialized to 0/empty arrays, so we can continue
      // This allows the admin dashboard to show even when database is unavailable
    }

    // Calculate success rate
    const successRate =
      totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

    console.log("[ADMIN STATS] Returning stats:", {
      totalUsers,
      totalJobs,
      successRate,
    })

    return NextResponse.json({
      overview: {
        totalUsers,
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        googleOAuthUsers,
        credentialUsers,
        successRate,
        totalDocuments,
        activeSubscribers,
        academicIntegrityAcceptedCount,
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
  } catch (error: unknown) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    )
  }
}
