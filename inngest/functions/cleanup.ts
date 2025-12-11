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
      
      const result = await prisma.job.updateMany({
        where: {
          status: { in: ["running", "pending"] },
          createdAt: { lt: eightHoursAgo },
        },
        data: {
          status: "failed",
          errorCode: "MAX_RUNTIME_EXCEEDED",
        },
      })

      return result.count
    })

    // Mark expired jobs (>7 days)
    const expiredJobs = await step.run("mark-expired-jobs", async () => {
      const now = new Date()
      
      const result = await prisma.job.updateMany({
        where: {
          status: { notIn: ["expired", "completed", "stopped", "failed"] },
          expiresAt: { lt: now },
        },
        data: {
          status: "expired",
        },
      })

      return result.count
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


