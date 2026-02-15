import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/inngest/client"
import { z } from "zod"
import { logger } from "@/lib/logger"
import { getUserLimits, isProfileAllowed, PlanTier } from "@/lib/constants/tiers"
import { getFreeTierOverrides } from "@/lib/settings"

const MAX_CHARS = 50000

const startJobSchema = z.object({
  textContent: z.string().min(1).max(MAX_CHARS),
  durationMinutes: z.coerce.number().min(10).max(360), // Coerce string to number
  typingProfile: z.enum(["steady", "fatigue", "burst", "micropause", "typing-test"]),
  documentId: z.string().min(1), // Ensure documentId is not empty
  testWPM: z.coerce.number().min(1).max(300).optional(), // WPM from typing test
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
    const validated = startJobSchema.parse(body)

    // Validate typing-test profile requires testWPM
    if (validated.typingProfile === "typing-test" && !validated.testWPM) {
      return NextResponse.json(
        { error: "testWPM is required when typingProfile is 'typing-test'" },
        { status: 400 }
      )
    }
    
    // Ignore testWPM for non-typing-test profiles
    if (validated.typingProfile !== "typing-test" && validated.testWPM) {
      validated.testWPM = undefined
    }

    // Fetch user's planTier from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { planTier: true },
    })

    const userTier: PlanTier = user?.planTier || 'FREE'
    let limits = getUserLimits(userTier)
    if (userTier === "FREE") {
      const overrides = await getFreeTierOverrides()
      if (overrides.maxJobsPerDay != null) limits = { ...limits, maxJobsPerDay: overrides.maxJobsPerDay }
      if (overrides.maxJobHistory != null) limits = { ...limits, maxJobHistory: overrides.maxJobHistory }
    }

    // Validate typing profile is allowed for user's tier
    if (!isProfileAllowed(userTier, validated.typingProfile)) {
      const requiredTier = validated.typingProfile === 'burst' || validated.typingProfile === 'micropause' 
        ? 'PRO' 
        : 'PRO'
      return NextResponse.json(
        { 
          error: `The ${validated.typingProfile} profile is not available on your current plan.`,
          upgradeRequired: requiredTier,
          currentTier: userTier,
        },
        { status: 403 }
      )
    }

    // Validate duration against tier limit
    if (limits.maxDurationMinutes !== null && validated.durationMinutes > limits.maxDurationMinutes) {
      const requiredTier = validated.durationMinutes > 360 ? 'UNLIMITED' : 'PRO'
      return NextResponse.json(
        { 
          error: `Duration limit exceeded. Your ${userTier} plan allows up to ${limits.maxDurationMinutes} minutes (${Math.round(limits.maxDurationMinutes / 60)} hours).`,
          upgradeRequired: requiredTier,
          currentTier: userTier,
          maxAllowed: limits.maxDurationMinutes,
        },
        { status: 403 }
      )
    }

    // Check daily job limit based on tier
    if (limits.maxJobsPerDay !== null) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const jobsToday = await prisma.job.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: today },
        },
      })

      if (jobsToday >= limits.maxJobsPerDay) {
        const requiredTier = userTier === 'FREE' ? 'BASIC' : userTier === 'BASIC' ? 'PRO' : 'UNLIMITED'
        return NextResponse.json(
          { 
            error: `Daily job limit reached. Your ${userTier} plan allows ${limits.maxJobsPerDay} jobs per day.`,
            upgradeRequired: requiredTier,
            currentTier: userTier,
            maxAllowed: limits.maxJobsPerDay,
          },
          { status: 403 }
        )
      }
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
            testWPM: validated.testWPM ? Number(validated.testWPM) : null,
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
      
      // Log job start event
      logger.job.start(job.id, session.user.id, {
        documentId: validated.documentId,
        totalChars: validated.textContent.length,
        durationMinutes: validated.durationMinutes,
        typingProfile: validated.typingProfile,
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
      await inngest.send({
        name: "job/start",
        data: { jobId: job.id },
      })
    } catch (err: any) {
      // Log error but don't block job creation
      if (process.env.NODE_ENV === "development") {
        console.error("Inngest dispatch failed (job still created and running):", {
          error: err?.message,
          statusCode: err?.status,
        })
      }
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
    
    // Log error details only in development
    if (process.env.NODE_ENV === "development") {
      console.error("[Start Job] Error:", {
        message: error?.message,
        name: error?.name,
      })
    }
    return NextResponse.json(
      { error: "Failed to start job", message: error?.message },
      { status: 500 }
    )
  }
}


