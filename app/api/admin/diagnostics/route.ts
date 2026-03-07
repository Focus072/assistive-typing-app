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

    // Database health check
    let dbStatus = "connected"
    let dbLatencyMs = 0
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - start
    } catch {
      dbStatus = "disconnected"
    }

    // Inngest environment check
    const inngestStatus = {
      eventKeySet: !!process.env.INNGEST_EVENT_KEY,
      signingKeySet: !!process.env.INNGEST_SIGNING_KEY,
      baseUrl: process.env.INNGEST_BASE_URL ?? "not set",
    }

    // Environment info
    const environment = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.round(process.uptime()),
      env: process.env.NODE_ENV ?? "unknown",
      vercelRegion: process.env.VERCEL_REGION ?? "local",
    }

    // Database stats
    let dbStats = { users: 0, jobs: 0, events: 0 }
    try {
      const [users, jobs, events] = await Promise.all([
        prisma.user.count(),
        prisma.job.count(),
        prisma.jobEvent.count(),
      ])
      dbStats = { users, jobs, events }
    } catch {
      // ignore
    }

    return NextResponse.json({
      database: { status: dbStatus, latencyMs: dbLatencyMs, stats: dbStats },
      inngest: inngestStatus,
      environment,
    })
  } catch {
    return NextResponse.json({ error: "Failed to run diagnostics" }, { status: 500 })
  }
}
