import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/inngest/client"
import { z } from "zod"

const MAX_CHARS = 50000
const MAX_JOBS_PER_DAY = 50

const startJobSchema = z.object({
  textContent: z.string().min(1).max(MAX_CHARS),
  durationMinutes: z.coerce.number().min(10).max(360), // Coerce string to number
  typingProfile: z.enum(["steady", "fatigue", "burst", "micropause"]),
  documentId: z.string().min(1), // Ensure documentId is not empty
})

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

    const body = await request.json()
    console.log("[Start Job] Received request:", {
      hasTextContent: !!body.textContent,
      textContentLength: body.textContent?.length,
      durationMinutes: body.durationMinutes,
      typingProfile: body.typingProfile,
      hasDocumentId: !!body.documentId,
    })
    const validated = startJobSchema.parse(body)

    // Check for existing running job
    const existingJob = await prisma.job.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["running", "pending"] },
      },
    })

    if (existingJob) {
      // If job is older than 1 hour, mark it as failed (likely stuck)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (existingJob.createdAt < oneHourAgo) {
        console.log(`[Start Job] Found stuck job ${existingJob.id}, marking as failed`)
        await prisma.job.update({
          where: { id: existingJob.id },
          data: { status: "failed", errorCode: "STUCK_JOB_CLEANUP" },
        })
        await prisma.jobEvent.create({
          data: {
            jobId: existingJob.id,
            type: "failed",
            details: JSON.stringify({ reason: "Stuck job cleanup" }),
          },
        })
      } else {
        return NextResponse.json(
          { error: `You already have a ${existingJob.status} job. Please stop it first or wait for it to complete.`, jobId: existingJob.id },
          { status: 400 }
        )
      }
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

    // Trigger Inngest function (non-blocking failure)
    try {
      // Log configuration for debugging
      const hasEventKey = !!process.env.INNGEST_EVENT_KEY
      const baseURL = process.env.INNGEST_BASE_URL
      console.log("[Inngest] Sending event:", {
        hasEventKey,
        baseURL: baseURL ? (baseURL.includes('localhost') ? 'local' : 'custom') : 'default (Inngest Cloud)',
        jobId: job.id,
      })

      await inngest.send({
        name: "job/start",
        data: { jobId: job.id },
      })
      
      console.log("[Inngest] Event sent successfully")
    } catch (err: any) {
      console.error("Inngest dispatch failed (job still created and running):", {
        error: err?.message,
        stack: err?.stack,
        hasEventKey: !!process.env.INNGEST_EVENT_KEY,
        baseURL: process.env.INNGEST_BASE_URL,
        statusCode: err?.status,
      })
      await prisma.jobEvent.create({
        data: {
          jobId: job.id,
          type: "start_dispatch_failed",
          details: JSON.stringify({ 
            message: err?.message ?? "unknown error",
            statusCode: err?.status,
            hasEventKey: !!process.env.INNGEST_EVENT_KEY,
          }),
        },
      })
      // keep status running; UI can retry if needed
    }

    return NextResponse.json({ jobId: job.id })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("[Start Job] Validation error:", JSON.stringify(error.errors, null, 2))
      
      // Create user-friendly error message
      const errorMessages = error.errors.map((err: any) => {
        const field = err.path.join('.')
        if (err.code === 'invalid_type') {
          return `${field}: expected ${err.expected}, got ${err.received}`
        }
        if (err.code === 'too_small') {
          return `${field}: ${err.message}`
        }
        if (err.code === 'too_big') {
          return `${field}: ${err.message}`
        }
        if (err.code === 'invalid_enum_value') {
          return `${field}: ${err.message}. Valid values: ${err.options?.join(', ')}`
        }
        return `${field}: ${err.message}`
      })
      
      return NextResponse.json(
        { 
          error: "Validation failed", 
          message: errorMessages.join('; '),
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    console.error("[Start Job] Error:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: "Failed to start job", message: error?.message },
      { status: 500 }
    )
  }
}


