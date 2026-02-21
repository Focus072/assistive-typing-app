import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")
    
    if (!jobId || jobId.trim().length === 0) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership - only return job metadata, never textContent
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        userId: true,
        status: true,
        currentIndex: true,
        totalChars: true,
        durationMinutes: true,
        // Explicitly exclude textContent for privacy
      },
    })

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        const sendUpdate = (data: Record<string, unknown>) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send initial state
        sendUpdate({
          jobId: job.id,
          status: job.status,
          currentIndex: job.currentIndex,
          totalChars: job.totalChars,
          durationMinutes: job.durationMinutes,
        })

        // Poll for updates - only fetch non-sensitive fields
        const interval = setInterval(async () => {
          try {
            const updatedJob = await prisma.job.findUnique({
              where: { id: jobId },
              select: {
                id: true,
                status: true,
                currentIndex: true,
                totalChars: true,
                durationMinutes: true,
                // Explicitly exclude textContent for privacy
              },
            })

            if (!updatedJob) {
              clearInterval(interval)
              controller.close()
              return
            }

            sendUpdate({
              jobId: updatedJob.id,
              status: updatedJob.status,
              currentIndex: updatedJob.currentIndex,
              totalChars: updatedJob.totalChars,
              durationMinutes: updatedJob.durationMinutes,
            })

            // Close stream if job is complete
            if (["completed", "stopped", "failed", "expired"].includes(updatedJob.status)) {
              clearInterval(interval)
              controller.close()
            }
          } catch (error) {
            // Log error but continue polling
            if (process.env.NODE_ENV === "development") {
              logger.error("Error polling job:", error)
            }
            clearInterval(interval)
            controller.close()
          }
        }, 1000) // Poll every second

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(interval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      logger.error("Error streaming progress:", error)
    }
    return NextResponse.json(
      { error: "Failed to stream progress" },
      { status: 500 }
    )
  }
}


