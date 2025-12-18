"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDuration } from "@/lib/utils"
import type { JobStatus } from "@/types"
import { useDashboardTheme } from "@/app/dashboard/layout"

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
  const { isDark } = useDashboardTheme()
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
      // Error handled by UI state
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
      // Error handled by UI state
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
      // Error handled by UI state
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
      // Error handled by UI state
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
      <div className={`rounded-xl overflow-hidden shadow-sm border ${
        isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
      }`}>
        <div className={`p-6 border-b ${
          isDark ? "border-[#333]" : "border-black/10"
        }`}>
          <h2 className={`text-xl font-semibold flex items-center gap-3 ${
            isDark ? "text-white" : "text-black"
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Job History
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
              isDark ? "border-white/20 border-t-white" : "border-black/20 border-t-black"
            }`} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl md:rounded-2xl overflow-hidden shadow-sm border ${
      isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
    }`}>
      <div className={`p-4 md:p-6 border-b ${
        isDark ? "border-[#333]" : "border-black/10"
      }`}>
        <h2 className={`text-lg md:text-xl font-semibold flex items-center gap-2 md:gap-3 ${
          isDark ? "text-white" : "text-black"
        }`}>
          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${
            isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"
          }`}>
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Job History
          <span className={`text-xs md:text-sm font-normal ml-auto ${
            isDark ? "text-white/60" : "text-black/60"
          }`}>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</span>
        </h2>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 md:p-12 text-center">
          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float ${
            isDark ? "bg-white/5" : "bg-black/5"
          }`}>
            <svg className={`w-6 h-6 md:w-8 md:h-8 ${
              isDark ? "text-white/40" : "text-black/40"
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className={`text-lg md:text-xl font-semibold mb-2 ${
            isDark ? "text-white" : "text-black"
          }`}>No jobs yet</h3>
          <p className={`text-sm md:text-base mb-4 ${
            isDark ? "text-white/60" : "text-black/60"
          }`}>Start your first typing job to see it here</p>
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium touch-manipulation ${
              isDark
                ? "bg-white text-black border-white hover:bg-white/90"
                : "bg-black text-white border-black hover:bg-gray-900"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Job
          </Link>
        </div>
      ) : (
        <div className={`divide-y ${
          isDark ? "divide-white/10" : "divide-black/10"
        }`}>
          {jobs.map((job) => {
            const progress = job.totalChars > 0 ? (job.currentIndex / job.totalChars) * 100 : 0
            const config = statusConfig[job.status]

            return (
              <div
                key={job.id}
                className={`p-5 transition-colors ${
                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status Badge */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}>
                        <span className={config.color}>{config.icon}</span>
                        <span className={`text-sm font-medium ${config.color}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </div>
                      <span className={`text-xs ${
                        isDark ? "text-white/60" : "text-black/60"
                      }`}>
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
                      <div className={`flex items-center justify-between text-xs mb-1 ${
                        isDark ? "text-white/60" : "text-black/60"
                      }`}>
                        <span>{job.currentIndex.toLocaleString()} / {job.totalChars.toLocaleString()} chars</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${
                        isDark ? "bg-white/10" : "bg-gray-200"
                      }`}>
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isDark ? "bg-white" : "bg-black"
                          }`}
                          style={{ width: `${progress}%` }}
                          role="progressbar"
                          aria-valuenow={job.currentIndex}
                          aria-valuemin={0}
                          aria-valuemax={job.totalChars}
                          aria-label={`Job progress: ${progress.toFixed(0)}%`}
                        />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className={`flex flex-wrap items-center gap-4 text-xs ${
                      isDark ? "text-white/60" : "text-black/60"
                    }`}>
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
                      <p className={`text-xs mt-2 flex items-center gap-1 ${
                        isDark ? "text-red-400" : "text-red-600"
                      }`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {job.errorCode}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    {/* View button - available for all jobs */}
                    <Link
                      href={`/dashboard?jobId=${job.id}`}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                        isDark
                          ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                          : "bg-white border-black/20 text-black hover:bg-gray-50"
                      }`}
                      aria-label={`View job ${job.id} on dashboard`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Link>
                    
                    {job.status === "paused" && (
                      <>
                        <button
                          onClick={() => handleResume(job.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            isDark
                              ? "bg-white text-black hover:bg-white/90"
                              : "bg-black text-white hover:bg-gray-900"
                          }`}
                          aria-label={`Resume job ${job.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                          Resume
                        </button>
                        <button
                          onClick={() => handleStop(job.id)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            isDark
                              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                              : "bg-white border-black/20 text-black hover:bg-gray-50"
                          }`}
                          aria-label={`Stop job ${job.id}`}
                        >
                          Stop
                        </button>
                      </>
                    )}
                    {job.status === "running" && (
                      <>
                        <button
                          onClick={() => handlePause(job.id)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                            isDark
                              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                              : "bg-white border-black/20 text-black hover:bg-gray-50"
                          }`}
                          aria-label={`Pause job ${job.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                          </svg>
                          Pause
                        </button>
                        <button
                          onClick={() => handleStop(job.id)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            isDark
                              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                              : "bg-white border-black/20 text-black hover:bg-gray-50"
                          }`}
                          aria-label={`Stop job ${job.id}`}
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
