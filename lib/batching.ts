import { prisma } from "./prisma"
import { createBatch, insertBatch, handleThrottling, resetThrottling } from "./google-docs"
import { calculateTypingTiming, shouldAddCorrection, simulateCorrection } from "./typing-engine"
import type { TypingProfile } from "@/types"

export async function processBatch(
  jobId: string,
  userId: string,
  documentId: string
): Promise<{ success: boolean; shouldContinue: boolean; error?: string }> {
  // Load job state
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    return { success: false, shouldContinue: false, error: "Job not found" }
  }

  // Check if job is still running
  if (job.status !== "running") {
    return { success: false, shouldContinue: false, error: `Job status: ${job.status}` }
  }

  // Check if job is expired
  if (job.expiresAt < new Date()) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "expired" },
    })
    return { success: false, shouldContinue: false, error: "Job expired" }
  }

  // Check max runtime (8 hours)
  const runtimeHours = (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60)
  if (runtimeHours > 8) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "failed", errorCode: "MAX_RUNTIME_EXCEEDED" },
    })
    return { success: false, shouldContinue: false, error: "Max runtime exceeded" }
  }

  // Compute batch from current index (idempotent pattern)
  const batch = createBatch(job.textContent, job.currentIndex, BATCH_SIZE)
  
  if (!batch) {
    // Job completed
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        currentIndex: job.totalChars,
      },
    })
    await prisma.jobEvent.create({
      data: {
        jobId,
        type: "completed",
        details: JSON.stringify({ totalChars: job.totalChars }),
      },
    })
    return { success: true, shouldContinue: false }
  }

  // Check idempotency: verify hash doesn't match last batch
  if (job.lastBatchHash === batch.hash) {
    // This batch was already inserted, skip it
    await prisma.job.update({
      where: { id: jobId },
      data: { currentIndex: batch.endIndex },
    })
    return { success: true, shouldContinue: true }
  }

  // Insert batch
  const result = await insertBatch(userId, documentId, batch)

  if (!result.success) {
    if (result.error === "GOOGLE_AUTH_REVOKED") {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "failed",
          errorCode: "GOOGLE_AUTH_REVOKED",
        },
      })
      await prisma.jobEvent.create({
        data: {
          jobId,
          type: "failed",
          details: JSON.stringify({ error: "GOOGLE_AUTH_REVOKED" }),
        },
      })
      return { success: false, shouldContinue: false, error: "GOOGLE_AUTH_REVOKED" }
    }

    if (result.error === "RATE_LIMIT") {
      // Handle throttling
      const newDelay = await handleThrottling(jobId, job.throttleDelayMs)
      await prisma.jobEvent.create({
        data: {
          jobId,
          type: "throttled",
          details: JSON.stringify({ delay: newDelay }),
        },
      })
      // Retry after delay
      return { success: false, shouldContinue: true, error: "RATE_LIMIT" }
    }

    // Other error - log and continue
    await prisma.jobEvent.create({
      data: {
        jobId,
        type: "batch_error",
        details: JSON.stringify({ error: result.error, batch: batch.hash }),
      },
    })
    return { success: false, shouldContinue: true, error: result.error }
  }

  // Success - update job state (idempotent: only update after successful API call)
  await prisma.job.update({
    where: { id: jobId },
    data: {
      currentIndex: batch.endIndex,
      lastBatchHash: batch.hash,
      throttleDelayMs: MIN_INTERVAL_MS, // Reset throttling on success
    },
  })

  await prisma.jobEvent.create({
    data: {
      jobId,
      type: "batch_success",
      details: JSON.stringify({
        insertedChars: result.insertedChars,
        currentIndex: batch.endIndex,
        revisionId: result.revisionId,
      }),
    },
  })

  // Reset throttling on success
  await resetThrottling(jobId)

  return { success: true, shouldContinue: true }
}

export async function calculateNextDelay(
  jobId: string,
  profile: TypingProfile
): Promise<number> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    return MIN_INTERVAL_MS
  }

  const timing = calculateTypingTiming(
    job.totalChars,
    job.durationMinutes,
    profile,
    job.currentIndex,
    job.throttleDelayMs
  )

  return timing.delay
}


