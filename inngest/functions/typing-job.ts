import { inngest } from "../client"
import { processBatch, calculateNextDelay } from "@/lib/batching"
import { prisma } from "@/lib/prisma"
import type { TypingProfile } from "@/types"

export const typingJob = inngest.createFunction(
  { id: "typing-job" },
  { event: "job/start" },
  async ({ event, step }) => {
    const { jobId } = event.data

    // Load job
    const job = await step.run("load-job", async () => {
      return await prisma.job.findUnique({
        where: { id: jobId },
      })
    })

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    // Check if job should continue
    const shouldContinue = await step.run("check-status", async () => {
      const currentJob = await prisma.job.findUnique({
        where: { id: jobId },
      })
      return currentJob?.status === "running"
    })

    if (!shouldContinue) {
      return { message: "Job is not running", jobId }
    }

    // Process batch
    const result = await step.run("process-batch", async () => {
      return await processBatch(jobId, job.userId, job.documentId)
    })

    if (!result.shouldContinue) {
      return { message: "Job completed or stopped", jobId, result }
    }

    if (!result.success && result.error === "RATE_LIMIT") {
      // Wait for throttling delay
      const delay = await step.run("get-throttle-delay", async () => {
        const currentJob = await prisma.job.findUnique({
          where: { id: jobId },
        })
        return currentJob?.throttleDelayMs || 2000
      })

      await step.sleep("throttle-wait", `${delay}ms`)
      
      // Retry batch
      return await step.sendEvent("retry-batch", {
        name: "job/batch",
        data: { jobId },
      })
    }

    // Calculate next delay
    const delay = await step.run("calculate-delay", async () => {
      return await calculateNextDelay(jobId, job.typingProfile as TypingProfile)
    })

    // Schedule next batch
    if (delay > 0) {
      await step.sleep("wait-for-next-batch", `${delay}ms`)
      
      return await step.sendEvent("next-batch", {
        name: "job/batch",
        data: { jobId },
      })
    }

    return { message: "Batch processed", jobId, result }
  }
)

export const typingBatch = inngest.createFunction(
  { id: "typing-batch" },
  { event: "job/batch" },
  async ({ event, step }) => {
    const { jobId } = event.data

    // Load job
    const job = await step.run("load-job", async () => {
      return await prisma.job.findUnique({
        where: { id: jobId },
      })
    })

    if (!job) {
      return { message: "Job not found", jobId }
    }

    // Check status
    if (job.status !== "running") {
      return { message: `Job status: ${job.status}`, jobId }
    }

    // Process batch
    const result = await step.run("process-batch", async () => {
      return await processBatch(jobId, job.userId, job.documentId)
    })

    if (!result.shouldContinue) {
      return { message: "Job completed", jobId, result }
    }

    if (!result.success && result.error === "RATE_LIMIT") {
      const delay = await step.run("get-throttle-delay", async () => {
        const currentJob = await prisma.job.findUnique({
          where: { id: jobId },
        })
        return currentJob?.throttleDelayMs || 2000
      })

      await step.sleep("throttle-wait", `${delay}ms`)
      
      return await step.sendEvent("retry-batch", {
        name: "job/batch",
        data: { jobId },
      })
    }

    // Calculate next delay
    const delay = await step.run("calculate-delay", async () => {
      return await calculateNextDelay(jobId, job.typingProfile as TypingProfile)
    })

    if (delay > 0) {
      await step.sleep("wait-for-next-batch", `${delay}ms`)
      
      return await step.sendEvent("next-batch", {
        name: "job/batch",
        data: { jobId },
      })
    }

    return { message: "Batch processed", jobId, result }
  }
)


