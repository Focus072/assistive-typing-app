import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

async function unwrapParams<T>(params: Promise<T> | T): Promise<T> {
  return Promise.resolve(params)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await unwrapParams(params)

    const [job, events] = await Promise.all([
      prisma.job.findUnique({ where: { id } }),
      prisma.jobEvent.findMany({
        where: { jobId: id, type: "batch_success" },
        orderBy: { createdAt: "asc" },
      }),
    ])

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Build WPM timeline from batch_success events
    type WPMPoint = { progress: number; wpm: number }
    const wpmTimeline: WPMPoint[] = []
    let totalWPM = 0
    let validPoints = 0

    for (const event of events) {
      try {
        const details = JSON.parse(event.details ?? "{}")
        const { insertedChars, currentIndex, delayMs } = details
        if (insertedChars > 0 && delayMs > 0 && job.totalChars > 0) {
          const instantWPM = Math.round((insertedChars / 5) / (delayMs / 60000))
          const progress = Math.min(1, currentIndex / job.totalChars)
          wpmTimeline.push({ progress, wpm: instantWPM })
          totalWPM += instantWPM
          validPoints++
        }
      } catch {
        // skip malformed event
      }
    }

    const avgWPM = validPoints > 0 ? Math.round(totalWPM / validPoints) : 0

    return NextResponse.json({
      job: {
        totalChars: job.totalChars,
        durationMinutes: job.durationMinutes,
        typingProfile: job.typingProfile,
        testWPM: job.testWPM,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
      wpmTimeline,
      avgWPM,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Failed to load report", message: msg }, { status: 500 })
  }
}
