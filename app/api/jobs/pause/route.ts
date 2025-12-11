import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    if (job.status !== "running") {
      return NextResponse.json(
        { error: `Job is not running (status: ${job.status})` },
        { status: 400 }
      )
    }

    // Pause job
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "paused" },
    })

    await prisma.jobEvent.create({
      data: {
        jobId,
        type: "paused",
        details: JSON.stringify({ currentIndex: job.currentIndex }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error pausing job:", error)
    return NextResponse.json(
      { error: "Failed to pause job" },
      { status: 500 }
    )
  }
}


