"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDuration } from "@/lib/utils"
import type { JobStatus } from "@/types"

interface Job {
  id: string
  documentId: string
  totalChars: number
  currentIndex: number
  durationMinutes: number
  typingProfile: string
  status: JobStatus
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  errorCode?: string | null
}

export function JobHistory() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/jobs")
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error("Failed to load jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async (jobId: string) => {
    try {
      const response = await fetch("/api/jobs/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        await loadJobs()
        window.location.href = `/dashboard?jobId=${jobId}`
      }
    } catch (error) {
      console.error("Failed to resume job:", error)
    }
  }

  const handlePause = async (jobId: string) => {
    try {
      const response = await fetch("/api/jobs/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        await loadJobs()
      }
    } catch (error) {
      console.error("Failed to pause job:", error)
    }
  }

  const handleStop = async (jobId: string) => {
    try {
      const response = await fetch("/api/jobs/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        await loadJobs()
      }
    } catch (error) {
      console.error("Failed to stop job:", error)
    }
  }

  const statusConfig: Record<JobStatus, { color: string; bg: string; icon: React.ReactNode }> = {
    pending: {
      color: "text-yellow-400",
      bg: "bg-yellow-400/20",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    running: {
      color: "text-emerald-400",
      bg: "bg-emerald-400/20",
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    paused: {
      color: "text-amber-400",
      bg: "bg-amber-400/20",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    completed: {
      color: "text-black",
      bg: "bg-gray-100",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    failed: {
      color: "text-red-400",
      bg: "bg-red-400/20",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    stopped: {
      color: "text-gray-400",
      bg: "bg-gray-400/20",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ),
    },
    expired: {
      color: "text-orange-400",
      bg: "bg-orange-400/20",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  }

  const profileLabels: Record<string, string> = {
    steady: "Steady",
    fatigue: "Fatigue",
    burst: "Burst",
    micropause: "Micro-pause",
  }

  if (loading) {
    return (
      <div className="bg-white border border-black rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-black">
          <h2 className="text-xl font-semibold text-black flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Job History
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 rounded-full animate-spin border-t-black" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-black rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 md:p-6 border-b border-black">
        <h2 className="text-lg md:text-xl font-semibold text-black flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Job History
          <span className="text-xs md:text-sm font-normal text-gray-600 ml-auto">{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</span>
        </h2>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 md:p-12 text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4 animate-float">
            <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-black mb-2">No jobs yet</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4">Start your first typing job to see it here</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black border border-black text-white hover:bg-gray-900 transition-all text-sm font-medium touch-manipulation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Job
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {jobs.map((job) => {
            const progress = job.totalChars > 0 ? (job.currentIndex / job.totalChars) * 100 : 0
            const config = statusConfig[job.status]

            return (
              <div
                key={job.id}
                className="p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status Badge */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}>
                        <span className={config.color}>{config.icon}</span>
                        <span className={`text-sm font-medium ${config.color}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-600">
                        {new Date(job.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{job.currentIndex.toLocaleString()} / {job.totalChars.toLocaleString()} chars</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(job.durationMinutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {profileLabels[job.typingProfile] || job.typingProfile}
                      </span>
                    </div>

                    {job.errorCode && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {job.errorCode}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {job.status === "paused" && (
                      <>
                        <button
                          onClick={() => handleResume(job.id)}
                          className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm font-medium transition-colors flex items-center gap-2"
                          aria-label="Resume job"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                          Resume
                        </button>
                        <button
                          onClick={() => handleStop(job.id)}
                          className="px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 text-sm font-medium transition-colors"
                          aria-label="Stop job"
                        >
                          Stop
                        </button>
                      </>
                    )}
                    {job.status === "running" && (
                      <>
                        <button
                          onClick={() => handlePause(job.id)}
                          className="px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2"
                          aria-label="Pause job"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                          </svg>
                          Pause
                        </button>
                        <button
                          onClick={() => handleStop(job.id)}
                          className="px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 text-sm font-medium transition-colors"
                          aria-label="Stop job"
                        >
                          Stop
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
