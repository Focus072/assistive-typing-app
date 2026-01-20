import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Check if user is admin (by email)
function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  // Always allow galaljobah@gmail.com as admin (independent of env var)
  if (email === "galaljobah@gmail.com") {
    return true
  }
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || []
  return adminEmails.includes(email)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin (by email or fallback ID)
    const isFallbackAdmin = session?.user?.id === "admin-fallback" || session?.user?.id === "dev-admin-fallback"
    const isAdminUser = session?.user?.email && isAdmin(session.user.email)
    // Also check if email is galaljobah@gmail.com directly (fallback)
    const isFallbackEmail = session?.user?.email === "galaljobah@gmail.com"

    if (!isFallbackAdmin && !isAdminUser && !isFallbackEmail) {
      console.warn("[ADMIN] Unauthorized access attempt:", {
        userId: session?.user?.id,
        email: session?.user?.email,
        isFallbackAdmin,
        isAdminUser,
        isFallbackEmail
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // If using fallback admin (database unavailable), return empty stats
    if (isFallbackAdmin || isFallbackEmail) {
      return NextResponse.json({
        overview: {
          totalUsers: 0,
          totalJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          totalWaitlist: 0,
          googleOAuthUsers: 0,
          credentialUsers: 0,
          successRate: 0,
        },
        topUser: null,
        recentUsers: [],
        recentJobs: [],
      })
    }

    // Get overview statistics
    let totalUsers = 0
    let totalJobs = 0
    let activeJobs = 0
    let completedJobs = 0
    let failedJobs = 0
    let totalWaitlist = 0
    let googleOAuthUsers = 0
    let credentialUsers = 0
    let recentUsers: any[] = []
    let recentJobs: any[] = []
    let topUser: any = null

    try {
      [
        totalUsers,
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        totalWaitlist,
        googleOAuthUsers,
        credentialUsers,
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
        
        // Google OAuth users (users with Google account linked)
        prisma.user.count({
          where: {
            accounts: {
              some: {
                provider: "google",
              },
            },
          },
        }),
        
        // Credential users (users with password)
        prisma.user.count({
          where: {
            password: {
              not: null,
            },
          },
        }),
        
        // Recent users (last 7 days) with account info
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
            image: true,
            createdAt: true,
            // Don't select password for security, but we can check if it exists via accounts
            accounts: {
              select: {
                provider: true,
              },
            },
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
    } catch (dbError: any) {
      // If database fails, use empty stats (already initialized above)
      console.error("Database error in admin stats:", dbError)
    }

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
        googleOAuthUsers,
        credentialUsers,
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
