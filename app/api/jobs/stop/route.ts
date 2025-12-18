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

    if (job.status === "stopped" || job.status === "completed" || job.status === "failed") {
      return NextResponse.json(
        { error: `Job is already ${job.status}` },
        { status: 400 }
      )
    }

    // Stop job (permanently non-resumable)
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "stopped" },
    })

    await prisma.jobEvent.create({
      data: {
        jobId,
        type: "stopped",
        details: JSON.stringify({ currentIndex: job.currentIndex }),
      },
    })

    // Unlock document with ownership verification
    const document = await prisma.document.findUnique({
      where: {
        userId_documentId: {
          userId: session.user.id,
          documentId: job.documentId,
        },
      },
    })

    // Verify ownership: currentJobId must match job.id
    if (document && document.currentJobId === jobId) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          state: "idle",
          currentJobId: null,
        },
      })
    }

    // Log job stop event
    logger.job.stop(jobId, session.user.id, "user_requested", {
      documentId: job.documentId,
      currentIndex: job.currentIndex,
      totalChars: job.totalChars,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", message: error.errors.map(e => e.message).join("; ") },
        { status: 400 }
      )
    }
    
    if (process.env.NODE_ENV === "development") {
      console.error("Error stopping job:", error?.message)
    }
    return NextResponse.json(
      { error: "Failed to stop job" },
      { status: 500 }
    )
  }
}


