import { inngest } from "../client"
import { prisma } from "@/lib/prisma"

// Daily cleanup job
export const cleanupJobs = inngest.createFunction(
  { id: "cleanup-jobs" },
  { cron: "0 2 * * *" }, // Run daily at 2 AM
  async ({ step }) => {
    // Mark stale running jobs as failed (>8 hours)
    const staleJobs = await step.run("mark-stale-jobs", async () => {
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000)
      
      // Find jobs that will be marked as stale
      const jobsToMarkStale = await prisma.job.findMany({
        where: {
          status: { in: ["running", "pending"] },
          createdAt: { lt: eightHoursAgo },
        },
        select: { id: true, userId: true, documentId: true },
      })

      // Mark jobs as failed
      await prisma.job.updateMany({
        where: {
          status: { in: ["running", "pending"] },
          createdAt: { lt: eightHoursAgo },
        },
        data: {
          status: "failed",
          errorCode: "MAX_RUNTIME_EXCEEDED",
        },
      })

      // Unlock documents for stale jobs
      for (const job of jobsToMarkStale) {
        await prisma.document.updateMany({
          where: {
            userId: job.userId,
            documentId: job.documentId,
            currentJobId: job.id,
          },
          data: {
            state: "idle",
            currentJobId: null,
          },
        })
      }

      return jobsToMarkStale.length
    })

    // Mark expired jobs (>7 days)
    const expiredJobs = await step.run("mark-expired-jobs", async () => {
      const now = new Date()
      
      // Find jobs that will be expired
      const jobsToExpire = await prisma.job.findMany({
        where: {
          status: { notIn: ["expired", "completed", "stopped", "failed"] },
          expiresAt: { lt: now },
        },
        select: { id: true, userId: true, documentId: true },
      })

      // Mark jobs as expired
      await prisma.job.updateMany({
        where: {
          status: { notIn: ["expired", "completed", "stopped", "failed"] },
          expiresAt: { lt: now },
        },
        data: {
          status: "expired",
        },
      })

      // Unlock documents for expired jobs
      for (const job of jobsToExpire) {
        await prisma.document.updateMany({
          where: {
            userId: job.userId,
            documentId: job.documentId,
            currentJobId: job.id,
          },
          data: {
            state: "idle",
            currentJobId: null,
          },
        })
      }

      return jobsToExpire.length
    })

    // Optionally scrub textContent from old jobs (>30 days)
    const scrubbedJobs = await step.run("scrub-old-jobs", async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const result = await prisma.job.updateMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          textContent: { not: "" },
        },
        data: {
          textContent: "", // Clear text content for privacy
        },
      })

      return result.count
    })

    // Delete very old jobs (>90 days)
    const deletedJobs = await step.run("delete-old-jobs", async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      
      const result = await prisma.job.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
        },
      })

      return result.count
    })

    return {
      staleJobs,
      expiredJobs,
      scrubbedJobs,
      deletedJobs,
    }
  }
)


