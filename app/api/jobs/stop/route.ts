import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

const stopJobSchema = z.object({
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
    const validated = stopJobSchema.parse(body)
    const { jobId } = validated

    // Single query: fetch job to verify ownership and read documentId in one shot
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { userId: true, status: true, documentId: true, currentIndex: true, totalChars: true },
    })

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
    if (job.userId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    if (job.status === "stopped" || job.status === "completed" || job.status === "failed") {
      return NextResponse.json({ error: `Job is already ${job.status}` }, { status: 400 })
    }

    // Run job update + document unlock in a single transaction (2 writes, 1 round-trip)
    await prisma.$transaction([
      prisma.job.update({ where: { id: jobId }, data: { status: "stopped" } }),
      prisma.document.updateMany({
        where: { userId: session.user.id, documentId: job.documentId, currentJobId: jobId },
        data: { state: "idle", currentJobId: null },
      }),
    ])

    // Fire-and-forget: audit log — don't block the response
    void prisma.jobEvent.create({
      data: { jobId, type: "stopped", details: JSON.stringify({ currentIndex: job.currentIndex }) },
    })
    logger.job.stop(jobId, session.user.id, "user_requested", {
      documentId: job.documentId,
      currentIndex: job.currentIndex,
      totalChars: job.totalChars,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", message: error.errors.map(e => e.message).join("; ") },
        { status: 400 }
      )
    }

    logger.error("Error stopping job:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to stop job" },
      { status: 500 }
    )
  }
}


