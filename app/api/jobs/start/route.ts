import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/inngest/client"
import { z } from "zod"

const MAX_CHARS = 50000
const MAX_JOBS_PER_DAY = 5

const startJobSchema = z.object({
  textContent: z.string().min(1).max(MAX_CHARS),
  durationMinutes: z.number().min(10).max(360),
  typingProfile: z.enum(["steady", "fatigue", "burst", "micropause"]),
  documentId: z.string(),
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
    const validated = startJobSchema.parse(body)

    // Check for existing running job
    const existingJob = await prisma.job.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["running", "pending"] },
      },
    })

    if (existingJob) {
      return NextResponse.json(
        { error: "You already have a running job" },
        { status: 400 }
      )
    }

    // Check daily job limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const jobsToday = await prisma.job.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: today },
      },
    })

    if (jobsToday >= MAX_JOBS_PER_DAY) {
      return NextResponse.json(
        { error: "Daily job limit reached" },
        { status: 400 }
      )
    }

    // Create job
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 day TTL

    const job = await prisma.job.create({
      data: {
        userId: session.user.id,
        documentId: validated.documentId,
        textContent: validated.textContent,
        totalChars: validated.textContent.length,
        durationMinutes: validated.durationMinutes,
        typingProfile: validated.typingProfile,
        status: "pending",
        expiresAt,
      },
    })

    // Create start event
    await prisma.jobEvent.create({
      data: {
        jobId: job.id,
        type: "started",
        details: JSON.stringify({
          durationMinutes: validated.durationMinutes,
          typingProfile: validated.typingProfile,
        }),
      },
    })

    // Update job to running
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running" },
    })

    // Trigger Inngest function
    await inngest.send({
      name: "job/start",
      data: { jobId: job.id },
    })

    return NextResponse.json({ jobId: job.id })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error starting job:", error)
    return NextResponse.json(
      { error: "Failed to start job" },
      { status: 500 }
    )
  }
}


