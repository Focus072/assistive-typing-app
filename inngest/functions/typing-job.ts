import { inngest } from "../client"
import { prisma } from "@/lib/prisma"
import { buildBatchPlan } from "@/lib/typing-engine"
import { insertBatch, deleteText, handleThrottling } from "@/lib/google-docs"
import type { TypingProfile } from "@/types"
import type { EngineState } from "@/lib/typing-state"
import { MIN_INTERVAL_MS } from "@/lib/batching"
import { logger } from "@/lib/logger"

function parseEngineState(json: string | null): EngineState | undefined {
  if (!json) return undefined
  try {
    return JSON.parse(json) as EngineState
  } catch {
    return undefined
  }
}

// How long each typingBatch invocation runs its inline batch loop before chaining
// to the next invocation. Must stay well under the platform function timeout
// (30 s on Vercel Hobby, 60 s on Pro). 22 s leaves an 8 s buffer.
const STEP_BUDGET_MS = 22_000

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

// typingJob: handles scheduling and activation only, then hands off to typingBatch.
export const typingJob = inngest.createFunction(
  { id: "typing-job" },
  { event: "job/start" },
  async ({ event, step }) => {
    const { jobId } = event.data

    // Check if this job has a future scheduled start time.
    // Read scheduledAt via raw SQL because the Prisma client may not yet reflect
    // the new column (client regeneration requires a dev server restart after db push).
    const scheduleInfo = await step.run("check-schedule", async () => {
      const rows = await prisma.$queryRaw<Array<{ status: string; scheduledAt: Date | null }>>`
        SELECT status, "scheduledAt" FROM "Job" WHERE id = ${jobId}
      `
      const row = rows[0]
      return {
        status: row?.status ?? "unknown",
        scheduledAt: row?.scheduledAt?.toISOString() ?? null,
      }
    })

    // Sleep until the scheduled time (Inngest will resume exactly then)
    if (scheduleInfo.status === "scheduled" && scheduleInfo.scheduledAt) {
      await step.sleep("wait-until-scheduled", scheduleInfo.scheduledAt)
    }

    // Transition from scheduled → running
    await step.run("activate-job", async () => {
      const job = await loadJob(jobId)
      if (!job) throw new Error(`Job ${jobId} not found`)
      if (job.status === "scheduled") {
        await prisma.job.update({ where: { id: jobId }, data: { status: "running" } })
        await prisma.jobEvent.create({ data: { jobId, type: "started", details: "{}" } })
      }
    })

    // Hand off all batch processing to typingBatch
    await step.sendEvent("start-batches", { name: "job/batch", data: { jobId } })
    return { message: "Job activated", jobId }
  }
)

// typingBatch: runs an inline batch loop for up to STEP_BUDGET_MS, then chains
// to the next invocation via job/batch event.  By sleeping with setTimeout inside
// a single step.run we pay Inngest's cold-start cost once per STEP_BUDGET window
// instead of once per batch — turning ~22 s/batch overhead into ~0.5 s/batch.
export const typingBatch = inngest.createFunction(
  {
    id: "typing-batch",
    // Limit to one concurrent execution per jobId.
    // Without this, duplicate job/batch events (from retries or replays) can spawn
    // parallel chains that compete for the Google Docs API and corrupt the doc index.
    concurrency: {
      limit: 1,
      key: "event.data.jobId",
    },
  },
  { event: "job/batch" },
  async ({ event, step }) => {
    const { jobId } = event.data

    const result = await step.run("process-batch-loop", async () => {
      const loopStart = Date.now()

      while (true) {
        // Budget check: if we're out of time, chain to the next invocation
        if (Date.now() - loopStart >= STEP_BUDGET_MS) {
          return { done: false }
        }

        const batchStart = Date.now()

        // Load fresh job state; exit loop if job is no longer runnable
        let fresh
        try {
          fresh = await ensureRunnable(jobId)
        } catch {
          return { done: true }
        }

        // Build batch plan
        let plan
        try {
          const savedState = parseEngineState(fresh.engineState ?? null)
          plan = buildBatchPlan(
            fresh.textContent,
            fresh.currentIndex,
            fresh.totalChars,
            fresh.durationMinutes,
            fresh.typingProfile as TypingProfile,
            fresh.testWPM ? Number(fresh.testWPM) : undefined,
            { jobId, engineState: savedState }
          )
        } catch (error: unknown) {
          logger.job.fail(jobId, fresh.userId, "ENGINE_VALIDATION_ERROR")
          await markFailed(jobId, "ENGINE_VALIDATION_ERROR")
          await prisma.jobEvent.create({
            data: {
              jobId,
              type: "failed",
              details: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown validation error",
                errorCode: "ENGINE_VALIDATION_ERROR",
              }),
            },
          })
          return { done: true }
        }

        if (!plan.batch) {
          await markCompleted(jobId, fresh.totalChars)
          return { done: true }
        }

        // Idempotency: if this batch was already inserted, skip the insert but
        // still observe the correct inter-batch delay before continuing.
        if (fresh.lastBatchHash && fresh.lastBatchHash === plan.batch.hash) {
          await prisma.job.update({
            where: { id: jobId },
            data: { currentIndex: plan.batch.endIndex },
          })
          const sleepMs = Math.max(0, plan.totalDelayMs - (Date.now() - batchStart))
          const remaining = STEP_BUDGET_MS - (Date.now() - loopStart)
          if (sleepMs > 0 && sleepMs < remaining) {
            await new Promise<void>(r => setTimeout(r, sleepMs))
          } else if (sleepMs >= remaining) {
            return { done: false }
          }
          continue
        }

        // Insert the batch into Google Docs
        const insertRes = await insertBatch(
          fresh.userId,
          fresh.documentId,
          plan.batch,
          fresh.docInsertIndex ?? undefined
        )

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
            // If the throttle delay would blow the budget, chain to next invocation
            const remaining = STEP_BUDGET_MS - (Date.now() - loopStart)
            if (newDelay >= remaining) {
              return { done: false }
            }
            await new Promise<void>(r => setTimeout(r, newDelay))
            continue
          }
          await prisma.jobEvent.create({
            data: {
              jobId,
              type: "batch_error",
              details: JSON.stringify({ error: insertRes.error, batch: plan.batch.hash }),
            },
          })
          const retryDelay = Math.max(fresh.throttleDelayMs, MIN_INTERVAL_MS)
          const remaining = STEP_BUDGET_MS - (Date.now() - loopStart)
          if (retryDelay >= remaining) {
            return { done: false }
          }
          await new Promise<void>(r => setTimeout(r, retryDelay))
          continue
        }

        // afterInsertDocIndex is the doc end after the main text was inserted
        const afterInsertDocIndex = insertRes.nextDocIndex

        // Optional mistake simulation using the known doc index — no extra documents.get
        let finalDocIndex = afterInsertDocIndex
        if (plan.mistakePlan.hasMistake) {
          if (plan.mistakePlan.wrongChar) {
            await insertBatch(fresh.userId, fresh.documentId, {
              text: plan.mistakePlan.wrongChar,
              startIndex: plan.batch.endIndex,
              endIndex: plan.batch.endIndex + 1,
              hash: plan.batch.hash + "_typo",
            }, afterInsertDocIndex)
            await deleteText(fresh.userId, fresh.documentId, 1, afterInsertDocIndex + 1)
            // wrongChar insert + delete = net 0 → finalDocIndex unchanged
          } else {
            await deleteText(fresh.userId, fresh.documentId, plan.mistakePlan.deleteCount, afterInsertDocIndex)
            finalDocIndex = afterInsertDocIndex - plan.mistakePlan.deleteCount
          }
        }

        // currentIndex: wrongChar typos net zero chars, plain deletes subtract
        const nextIndex =
          plan.batch.endIndex -
          (plan.mistakePlan.hasMistake && !plan.mistakePlan.wrongChar ? plan.mistakePlan.deleteCount : 0)

        await prisma.job.update({
          where: { id: jobId },
          data: {
            currentIndex: nextIndex,
            lastBatchHash: plan.batch.hash,
            throttleDelayMs: MIN_INTERVAL_MS,
            docInsertIndex: finalDocIndex,
            engineState: JSON.stringify(plan.engineState),
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

        // Inline inter-batch sleep: target delay minus time already spent on this batch
        const batchMs = Date.now() - batchStart
        const sleepMs = Math.max(0, plan.totalDelayMs - batchMs)
        const remaining = STEP_BUDGET_MS - (Date.now() - loopStart)

        if (sleepMs >= remaining) {
          // The sleep would exhaust the budget — chain to next invocation instead
          return { done: false }
        }

        if (sleepMs > 0) {
          await new Promise<void>(r => setTimeout(r, sleepMs))
        }
        // (Pause/stop is detected at the top of the next iteration via ensureRunnable)
      }
    })

    if (result.done) {
      return { message: "Job completed", jobId }
    }

    // Chain to next invocation to continue processing
    await step.sendEvent("continue-batches", { name: "job/batch", data: { jobId } })
    return { message: "Chaining to next batch invocation", jobId }
  }
)
