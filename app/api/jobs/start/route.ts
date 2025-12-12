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

    // Atomic transaction: check document state and create job
    let job
    try {
      job = await prisma.$transaction(async (tx) => {
        // 1. Upsert Document, locking the row
        const document = await tx.document.upsert({
          where: {
            userId_documentId: {
              userId: session.user.id,
              documentId: validated.documentId,
            },
          },
          create: {
            userId: session.user.id,
            documentId: validated.documentId,
            state: "idle",
            currentJobId: null,
          },
          update: {}, // Lock row for update
        })

        // 2. Check for stuck job (older than 1 hour) and cleanup
        if (document.currentJobId) {
          const existingJob = await tx.job.findUnique({
            where: { id: document.currentJobId },
          })

          if (existingJob) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
            if (existingJob.createdAt < oneHourAgo) {
              console.log(`[Start Job] Found stuck job ${existingJob.id}, marking as failed`)
              await tx.job.update({
                where: { id: existingJob.id },
                data: { status: "failed", errorCode: "STUCK_JOB_CLEANUP" },
              })
              await tx.jobEvent.create({
                data: {
                  jobId: existingJob.id,
                  type: "failed",
                  details: JSON.stringify({ reason: "Stuck job cleanup" }),
                },
              })
              // Unlock document
              await tx.document.update({
                where: { id: document.id },
                data: { state: "idle", currentJobId: null },
              })
            }
          }
        }

        // 3. Assert state is not running
        const freshDocument = await tx.document.findUnique({
          where: { id: document.id },
        })

        if (freshDocument && freshDocument.state === "running") {
          throw new Error("This document already has an active typing job. Please wait for it to complete or stop it first.")
        }

        // 4. Create job
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 day TTL

        const newJob = await tx.job.create({
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

        // 5. Create start event
        await tx.jobEvent.create({
          data: {
            jobId: newJob.id,
            type: "started",
            details: JSON.stringify({
              durationMinutes: validated.durationMinutes,
              typingProfile: validated.typingProfile,
            }),
          },
        })

        // 6. Update job to running
        await tx.job.update({
          where: { id: newJob.id },
          data: { status: "running" },
        })

        // 7. Update Document atomically
        await tx.document.update({
          where: { id: freshDocument!.id },
          data: {
            state: "running",
            currentJobId: newJob.id,
          },
        })

        return newJob
      })
    } catch (error: any) {
      // Handle transaction errors
      if (error.message && error.message.includes("active typing job")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      throw error
    }

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


