import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

const pauseJobSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = pauseJobSchema.parse(body)
    const { jobId } = validated

    // Single query: update only if owned by this user and currently running.
    // Returns the updated row or null — no separate findUnique needed.
    const updated = await prisma.job.updateMany({
      where: { id: jobId, userId: session.user.id, status: "running" },
      data: { status: "paused" },
    })

    if (updated.count === 0) {
      // Could be not found, wrong owner, or not running — check which
      const job = await prisma.job.findUnique({ where: { id: jobId }, select: { userId: true, status: true } })
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
      if (job.userId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      return NextResponse.json({ error: `Job is not running (status: ${job.status})` }, { status: 400 })
    }

    // Fire-and-forget: log event + audit — don't block the response
    void prisma.jobEvent.create({
      data: { jobId, type: "paused", details: "{}" },
    })
    logger.job.pause(jobId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", message: error.errors.map(e => e.message).join("; ") },
        { status: 400 }
      )
    }

    logger.error("Error pausing job:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to pause job" },
      { status: 500 }
    )
  }
}


