"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { JobStatus, TypingProfile } from "@/types"

interface UseJobPollingOptions {
  onCompleted?: (totalChars: number) => void
  toast: { addToast: (msg: string, type: "success" | "error" | "info" | "warning") => void }
}

export interface JobState {
  currentJobId: string | null
  jobStatus: JobStatus
  currentIndex: number
  totalChars: number
  jobDurationMinutes: number
  jobTypingProfile: TypingProfile
  jobTestWPM: number | undefined
  jobStartTime: Date | null
  indexAtLoad: number
}

export function useJobPolling({ onCompleted, toast }: UseJobPollingOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobIdParam = searchParams.get("jobId")

  const [currentJobId, setCurrentJobId] = useState<string | null>(jobIdParam)
  const currentJobIdRef = useRef<string | null>(jobIdParam)
  const prevJobIdRef = useRef<string | null | undefined>(undefined)
  const progressStreamRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [jobDurationMinutes, setJobDurationMinutes] = useState(30)
  const [jobTypingProfile, setJobTypingProfile] = useState<TypingProfile>("steady")
  const [jobTestWPM, setJobTestWPM] = useState<number | undefined>(undefined)
  const [jobStartTime, setJobStartTime] = useState<Date | null>(null)
  const [indexAtLoad, setIndexAtLoad] = useState(0)

  // Keep ref in sync with state
  useEffect(() => {
    currentJobIdRef.current = currentJobId
  }, [currentJobId])

  const startProgressStream = useCallback((id: string) => {
    if (progressStreamRef.current) {
      progressStreamRef.current.close()
      progressStreamRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    const eventSource = new EventSource(`/api/progress/stream?jobId=${id}&interval=2000`)
    progressStreamRef.current = eventSource
    const maxReconnectAttempts = 10
    const reconnectDelay = 2000

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setJobStatus(data.status as JobStatus)
        setCurrentIndex(data.currentIndex)
        setTotalChars(data.totalChars)
        setJobDurationMinutes(data.durationMinutes)
        reconnectAttemptsRef.current = 0

        if (["completed", "stopped", "failed", "expired"].includes(data.status)) {
          eventSource.close()
          progressStreamRef.current = null
        }
      } catch {
        // Silently handle parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      progressStreamRef.current = null

      if (currentJobIdRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++
        const delay = reconnectDelay * Math.min(reconnectAttemptsRef.current, 5)
        reconnectTimeoutRef.current = setTimeout(() => {
          if (currentJobIdRef.current === id) {
            startProgressStream(id)
          }
          reconnectTimeoutRef.current = null
        }, delay)
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        toast.addToast("Lost connection to job progress. Refresh the page to reconnect.", "warning")
      }
    }
  }, [toast])

  const loadJob = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`)
      if (response.ok) {
        const data = await response.json()
        const job = data.job
        setCurrentJobId(job.id)
        setJobStatus(job.status as JobStatus)
        setCurrentIndex(job.currentIndex)
        setTotalChars(job.totalChars)
        setJobDurationMinutes(job.durationMinutes)
        setJobTypingProfile(job.typingProfile as TypingProfile)
        setJobTestWPM(job.testWPM ? Number(job.testWPM) : undefined)
        if (job.status === "running") {
          setJobStartTime(new Date())
          setIndexAtLoad(job.currentIndex)
        } else {
          setJobStartTime(new Date(job.createdAt))
          setIndexAtLoad(0)
        }
        // Return job data so the caller can restore form state
        return job
      }
    } catch {
      toast.addToast("Failed to load job", "error")
    }
    return null
  }, [toast])

  // Load job from URL param, or signal "reset" when param is absent
  useEffect(() => {
    if (jobIdParam) {
      loadJob(jobIdParam)
    } else {
      setCurrentJobId(null)
      setJobStatus("pending")
      setCurrentIndex(0)
      setTotalChars(0)
      setJobStartTime(null)
      setIndexAtLoad(0)
    }
    prevJobIdRef.current = jobIdParam
  }, [jobIdParam, loadJob])

  // Manage EventSource lifecycle
  useEffect(() => {
    const jobId = currentJobId
    if (!jobId) {
      if (progressStreamRef.current) {
        progressStreamRef.current.close()
        progressStreamRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      reconnectAttemptsRef.current = 0
      return
    }

    startProgressStream(jobId)

    return () => {
      if (progressStreamRef.current) {
        progressStreamRef.current.close()
        progressStreamRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      reconnectAttemptsRef.current = 0
    }
  }, [currentJobId, startProgressStream])

  const resetJobState = useCallback(() => {
    setCurrentJobId(null)
    setJobStatus("pending")
    setCurrentIndex(0)
    setTotalChars(0)
    setJobStartTime(null)
    setIndexAtLoad(0)
  }, [])

  return {
    // State
    currentJobId,
    jobStatus,
    currentIndex,
    totalChars,
    jobDurationMinutes,
    jobTypingProfile,
    jobTestWPM,
    jobStartTime,
    indexAtLoad,
    jobIdParam,
    prevJobIdRef,

    // Setters (for external control by handlers)
    setCurrentJobId,
    setJobStatus,
    setCurrentIndex,
    setTotalChars,
    setJobDurationMinutes,
    setJobTypingProfile,
    setJobTestWPM,
    setJobStartTime,
    setIndexAtLoad,

    // Actions
    loadJob,
    startProgressStream,
    resetJobState,
  }
}
