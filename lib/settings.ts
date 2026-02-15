import { prisma } from "@/lib/prisma"

let cache: { maxJobsPerDay: number | null; maxJobHistory: number | null } | null = null
let cacheTime = 0
const CACHE_MS = 60 * 1000

export async function getFreeTierOverrides(): Promise<{
  maxJobsPerDay: number | null
  maxJobHistory: number | null
}> {
  const now = Date.now()
  if (cache !== null && now - cacheTime < CACHE_MS) {
    return cache
  }
  try {
    const jobsKey = await prisma.setting.findUnique({
      where: { key: "FREE_MAX_JOBS_PER_DAY" },
    })
    const historyKey = await prisma.setting.findUnique({
      where: { key: "FREE_MAX_JOB_HISTORY" },
    })
    const maxJobsPerDay = jobsKey?.value != null ? parseInt(jobsKey.value, 10) : null
    const maxJobHistory = historyKey?.value != null ? parseInt(historyKey.value, 10) : null
    cache = {
      maxJobsPerDay: Number.isNaN(maxJobsPerDay) ? null : maxJobsPerDay,
      maxJobHistory: Number.isNaN(maxJobHistory) ? null : maxJobHistory,
    }
    cacheTime = now
    return cache
  } catch {
    return { maxJobsPerDay: null, maxJobHistory: null }
  }
}
