import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/inngest/client"
import { z } from "zod"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

const resumeJobSchema = z.object({
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
    const validated = resumeJobSchema.parse(body)
    const { jobId } = validated

    // Verify ownership
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    if (job.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    if (job.status !== "paused") {
      return NextResponse.json(
        { error: `Job is not paused (status: ${job.status})` },
        { status: 400 }
      )
    }

    // Check for other running jobs
    const existingJob = await prisma.job.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["running", "pending"] },
        id: { not: jobId },
      },
    })

    if (existingJob) {
      return NextResponse.json(
        { error: "You already have a running job" },
        { status: 400 }
      )
    }

    // Resume job
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "running" },
    })

    await prisma.jobEvent.create({
      data: {
        jobId,
        type: "resumed",
        details: JSON.stringify({ currentIndex: job.currentIndex }),
      },
    })

    // Trigger Inngest function
    await inngest.send({
      name: "job/batch",
      data: { jobId },
    })

    // Log job resume event
    logger.job.resume(jobId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", message: error.errors.map(e => e.message).join("; ") },
        { status: 400 }
      )
    }
    
    logger.error("Error resuming job:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to resume job" },
      { status: 500 }
    )
  }
}


