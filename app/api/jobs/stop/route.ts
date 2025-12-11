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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error stopping job:", error)
    return NextResponse.json(
      { error: "Failed to stop job" },
      { status: 500 }
    )
  }
}


