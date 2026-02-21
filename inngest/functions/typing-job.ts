import { inngest } from "../client"
import { prisma } from "@/lib/prisma"
import { buildBatchPlan } from "@/lib/typing-engine"
import { insertBatch, deleteText, handleThrottling, resetThrottling } from "@/lib/google-docs"
import type { TypingProfile } from "@/types"
import { MIN_INTERVAL_MS } from "@/lib/batching"
import { logger } from "@/lib/logger"

async function loadJob(jobId: string) {
  return prisma.job.findUnique({ where: { id: jobId } })
}

async function markCompleted(jobId: string, totalChars: number) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { userId: true, documentId: true },
  })

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "completed", completedAt: new Date(), currentIndex: totalChars },
  })
  await prisma.jobEvent.create({
    data: { jobId, type: "completed", details: JSON.stringify({ totalChars }) },
  })

  // Log job completion
  if (job) {
    logger.job.complete(jobId, job.userId, { totalChars })
  }

  // Unlock document atomically
  if (job) {
    await prisma.document.updateMany({
      where: {
        userId: job.userId,
        documentId: job.documentId,
        currentJobId: jobId,
      },
      data: {
        state: "idle",
        currentJobId: null,
      },
    })
  }
}

async function markFailed(jobId: string, code: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { userId: true, documentId: true },
  })

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "failed", errorCode: code },
  })
  await prisma.jobEvent.create({
    data: { jobId, type: "failed", details: JSON.stringify({ error: code }) },
  })

  // Log job failure
  if (job) {
    logger.job.fail(jobId, job.userId, code)
  }

  // Unlock document atomically
  if (job) {
    await prisma.document.updateMany({
      where: {
        userId: job.userId,
        documentId: job.documentId,
        currentJobId: jobId,
      },
      data: {
        state: "idle",
        currentJobId: null,
      },
    })
  }
}

async function ensureRunnable(jobId: string) {
  const job = await loadJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)
  if (job.status !== "running") throw new Error(`Job status: ${job.status}`)
  if (job.expiresAt < new Date()) {
    await prisma.job.update({ where: { id: jobId }, data: { status: "expired" } })
    // Unlock document when job expires
    await prisma.document.updateMany({
      where: {
        userId: job.userId,
        documentId: job.documentId,
        currentJobId: jobId,
      },
      data: {
        state: "idle",
        currentJobId: null,
      },
    })
    throw new Error("Job expired")
  }
  const runtimeHours = (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60)
  if (runtimeHours > 8) {
    await markFailed(jobId, "MAX_RUNTIME_EXCEEDED")
    throw new Error("Max runtime exceeded")
  }
  return job
}

export const typingJob = inngest.createFunction(
  { id: "typing-job" },
  { event: "job/start" },
  async ({ event, step }) => {
    const { jobId } = event.data

    const job = await step.run("load-job", async () => ensureRunnable(jobId))

    const next = await step.run("process-next-batch", async () => {
      const fresh = await ensureRunnable(jobId)
      
      let plan
      try {
        plan = buildBatchPlan(
          fresh.textContent,
          fresh.currentIndex,
          fresh.totalChars,
          fresh.durationMinutes,
          fresh.typingProfile as TypingProfile,
          fresh.testWPM ? Number(fresh.testWPM) : undefined
        )
      } catch (error: unknown) {
        // Catch validation errors and mark job as failed
        logger.job.fail(jobId, fresh.userId, "ENGINE_VALIDATION_ERROR")
        await markFailed(jobId, "ENGINE_VALIDATION_ERROR")
        await prisma.jobEvent.create({
          data: {
            jobId,
            type: "failed",
            details: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown validation error",
              errorCode: "ENGINE_VALIDATION_ERROR"
            }),
          },
        })
        return { done: true }
      }

      if (!plan.batch) {
        await markCompleted(jobId, fresh.totalChars)
        return { done: true }
      }

      // idempotency: skip if hash matches last
      if (fresh.lastBatchHash && fresh.lastBatchHash === plan.batch.hash) {
        await prisma.job.update({
          where: { id: jobId },
          data: { currentIndex: plan.batch.endIndex },
        })
        return { done: false, delay: plan.totalDelayMs }
      }

      // Insert text
      const insertRes = await insertBatch(fresh.userId, fresh.documentId, plan.batch)
      if (!insertRes.success) {
        if (insertRes.error === "GOOGLE_AUTH_REVOKED") {
          await markFailed(jobId, "GOOGLE_AUTH_REVOKED")
          return { done: true }
        }
        if (insertRes.error === "RATE_LIMIT") {
          const newDelay = await handleThrottling(jobId, fresh.throttleDelayMs)
          await prisma.jobEvent.create({
            data: {
              jobId,
              type: "throttled",
              details: JSON.stringify({ delay: newDelay }),
            },
          })
          return { done: false, delay: newDelay }
        }
        await prisma.jobEvent.create({
          data: {
            jobId,
            type: "batch_error",
            details: JSON.stringify({ error: insertRes.error, batch: plan.batch.hash }),
          },
        })
        return { done: false, delay: Math.max(fresh.throttleDelayMs, MIN_INTERVAL_MS) }
      }

      // Optional mistake simulation: delete a char and move index back
      if (plan.mistakePlan.hasMistake) {
        await deleteText(fresh.userId, fresh.documentId, plan.mistakePlan.deleteCount)
      }

      // Update job state
      await prisma.job.update({
        where: { id: jobId },
        data: {
          currentIndex: plan.batch.endIndex - (plan.mistakePlan.hasMistake ? plan.mistakePlan.deleteCount : 0),
          lastBatchHash: plan.batch.hash,
          throttleDelayMs: MIN_INTERVAL_MS,
        },
      })

      await prisma.jobEvent.create({
        data: {
          jobId,
          type: "batch_success",
          details: JSON.stringify({
            insertedChars: plan.batch.text.length,
            currentIndex: plan.batch.endIndex,
            delayMs: plan.totalDelayMs,
          }),
        },
      })

      await resetThrottling(jobId)
      return { done: false, delay: plan.totalDelayMs }
    })

    if (next.done) {
      return { message: "Job completed", jobId }
    }

    const delay = Math.max(
      "delay" in next && typeof next.delay === "number" ? next.delay : MIN_INTERVAL_MS,
      MIN_INTERVAL_MS
    )
    await step.sleep("wait-next-batch", `${delay}ms`)
    await step.sendEvent("next-batch", { name: "job/batch", data: { jobId } })
    return { message: "Scheduled next batch", jobId, delay }
  }
)

export const typingBatch = inngest.createFunction(
  { id: "typing-batch" },
  { event: "job/batch" },
  async ({ event, step }) => {
    const { jobId } = event.data

    const next = await step.run("process-next-batch", async () => {
      const fresh = await ensureRunnable(jobId)
      
      let plan
      try {
        plan = buildBatchPlan(
          fresh.textContent,
          fresh.currentIndex,
          fresh.totalChars,
          fresh.durationMinutes,
          fresh.typingProfile as TypingProfile,
          fresh.testWPM ? Number(fresh.testWPM) : undefined
        )
      } catch (error: unknown) {
        // Catch validation errors and mark job as failed
        logger.job.fail(jobId, fresh.userId, "ENGINE_VALIDATION_ERROR")
        await markFailed(jobId, "ENGINE_VALIDATION_ERROR")
        await prisma.jobEvent.create({
          data: {
            jobId,
            type: "failed",
            details: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown validation error",
              errorCode: "ENGINE_VALIDATION_ERROR"
            }),
          },
        })
        return { done: true }
      }

      if (!plan.batch) {
        await markCompleted(jobId, fresh.totalChars)
        return { done: true }
      }

      if (fresh.lastBatchHash && fresh.lastBatchHash === plan.batch.hash) {
        await prisma.job.update({
          where: { id: jobId },
          data: { currentIndex: plan.batch.endIndex },
        })
        return { done: false, delay: plan.totalDelayMs }
      }

      const insertRes = await insertBatch(fresh.userId, fresh.documentId, plan.batch)
      if (!insertRes.success) {
        if (insertRes.error === "GOOGLE_AUTH_REVOKED") {
          await markFailed(jobId, "GOOGLE_AUTH_REVOKED")
          return { done: true }
        }
        if (insertRes.error === "RATE_LIMIT") {
          const newDelay = await handleThrottling(jobId, fresh.throttleDelayMs)
          await prisma.jobEvent.create({
            data: {
              jobId,
              type: "throttled",
              details: JSON.stringify({ delay: newDelay }),
            },
          })
          return { done: false, delay: newDelay }
        }
        await prisma.jobEvent.create({
          data: {
            jobId,
            type: "batch_error",
            details: JSON.stringify({ error: insertRes.error, batch: plan.batch.hash }),
          },
        })
        return { done: false, delay: Math.max(fresh.throttleDelayMs, MIN_INTERVAL_MS) }
      }

      if (plan.mistakePlan.hasMistake) {
        await deleteText(fresh.userId, fresh.documentId, plan.mistakePlan.deleteCount)
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          currentIndex: plan.batch.endIndex - (plan.mistakePlan.hasMistake ? plan.mistakePlan.deleteCount : 0),
          lastBatchHash: plan.batch.hash,
          throttleDelayMs: MIN_INTERVAL_MS,
        },
      })

      await prisma.jobEvent.create({
        data: {
          jobId,
          type: "batch_success",
          details: JSON.stringify({
            insertedChars: plan.batch.text.length,
            currentIndex: plan.batch.endIndex,
            delayMs: plan.totalDelayMs,
          }),
        },
      })

      await resetThrottling(jobId)
      return { done: false, delay: plan.totalDelayMs }
    })

    if (next.done) {
      return { message: "Job completed", jobId }
    }

    const delay = Math.max(
      "delay" in next && typeof next.delay === "number" ? next.delay : MIN_INTERVAL_MS,
      MIN_INTERVAL_MS
    )
    await step.sleep("wait-next-batch", `${delay}ms`)
    await step.sendEvent("next-batch", { name: "job/batch", data: { jobId } })
    return { message: "Scheduled next batch", jobId, delay }
  }
)
