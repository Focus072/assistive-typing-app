import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/inngest/client"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { jobId } = await request.json()
    
    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      )
    }

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resuming job:", error)
    return NextResponse.json(
      { error: "Failed to resume job" },
      { status: 500 }
    )
  }
}


