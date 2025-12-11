"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { TextInput } from "@/components/TextInput"
import { TimeSelector } from "@/components/TimeSelector"
import { TypingProfileSelector } from "@/components/TypingProfileSelector"
import { DocsSelector } from "@/components/DocsSelector"
import { PlaybackControls } from "@/components/PlaybackControls"
import { StatusDisplay } from "@/components/StatusDisplay"
import { JobHistory } from "@/components/JobHistory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { TypingProfile, JobStatus } from "@/types"
import { useRouter } from "next/navigation"

function DashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobIdParam = searchParams.get("jobId")

  const [textContent, setTextContent] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [typingProfile, setTypingProfile] = useState<TypingProfile>("steady")
  const [documentId, setDocumentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Job state
  const [currentJobId, setCurrentJobId] = useState<string | null>(jobIdParam)
  const currentJobIdRef = useRef<string | null>(jobIdParam)
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [jobDurationMinutes, setJobDurationMinutes] = useState(30)

  // Keep ref in sync with state
  useEffect(() => {
    currentJobIdRef.current = currentJobId
  }, [currentJobId])

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
        setDocumentId(job.documentId)
      }
    } catch (error) {
      console.error("Failed to load job:", error)
    }
  }, [])

  const startProgressStream = useCallback((id: string) => {
    const eventSource = new EventSource(`/api/progress/stream?jobId=${id}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setJobStatus(data.status as JobStatus)
        setCurrentIndex(data.currentIndex)
        setTotalChars(data.totalChars)
        setJobDurationMinutes(data.durationMinutes)

        if (["completed", "stopped", "failed", "expired"].includes(data.status)) {
          eventSource.close()
        }
      } catch (error) {
        console.error("Failed to parse progress update:", error)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setTimeout(() => {
        if (currentJobIdRef.current) {
          startProgressStream(currentJobIdRef.current)
        }
      }, 2000)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  useEffect(() => {
    if (jobIdParam) {
      loadJob(jobIdParam)
      startProgressStream(jobIdParam)
    }
  }, [jobIdParam, loadJob, startProgressStream])

  const handleCreateDocument = async (title: string): Promise<string> => {
    const response = await fetch("/api/google-docs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })

    if (!response.ok) {
      const data = await response.json()
      if (data.code === "GOOGLE_AUTH_REVOKED") {
        setError("Please connect your Google account first")
        throw new Error("Google authentication required")
      }
      throw new Error("Failed to create document")
    }

    const data = await response.json()
    return data.documentId
  }

  const handleStart = async () => {
    if (!textContent.trim()) {
      setError("Please enter text to type")
      return
    }

    if (!documentId) {
      setError("Please select or create a Google Document")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textContent,
          durationMinutes,
          typingProfile,
          documentId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to start job")
        return
      }

      const data = await response.json()
      setCurrentJobId(data.jobId)
      setJobStatus("running")
      setTotalChars(textContent.length)
      setJobDurationMinutes(durationMinutes)
      startProgressStream(data.jobId)
      
      router.push(`/dashboard?jobId=${data.jobId}`)
    } catch (error) {
      setError("Failed to start job")
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    if (!currentJobId) return

    setLoading(true)
    try {
      const response = await fetch("/api/jobs/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId }),
      })

      if (response.ok) {
        setJobStatus("paused")
      }
    } catch (error) {
      setError("Failed to pause job")
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async () => {
    if (!currentJobId) return

    setLoading(true)
    try {
      const response = await fetch("/api/jobs/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId }),
      })

      if (response.ok) {
        setJobStatus("running")
        startProgressStream(currentJobId)
      }
    } catch (error) {
      setError("Failed to resume job")
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!currentJobId) return

    setLoading(true)
    try {
      const response = await fetch("/api/jobs/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId }),
      })

      if (response.ok) {
        setJobStatus("stopped")
        setCurrentJobId(null)
      }
    } catch (error) {
      setError("Failed to stop job")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Assistive Typing</h1>
        <p className="text-muted-foreground mt-2">
          Automatically type text into Google Docs with human-like rhythm
        </p>
      </div>

      {error && (
        <div
          className="rounded-md bg-destructive/10 p-4 text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <TextInput
                value={textContent}
                onChange={setTextContent}
                maxChars={50000}
              />

              <TimeSelector
                value={durationMinutes}
                onChange={setDurationMinutes}
              />

              <TypingProfileSelector
                value={typingProfile}
                onChange={setTypingProfile}
              />

              <DocsSelector
                value={documentId}
                onChange={setDocumentId}
                onCreateNew={handleCreateDocument}
              />

              <PlaybackControls
                status={jobStatus}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                disabled={loading}
              />
            </CardContent>
          </Card>

          {currentJobId && (
            <StatusDisplay
              jobId={currentJobId}
              status={jobStatus}
              currentIndex={currentIndex}
              totalChars={totalChars}
              durationMinutes={jobDurationMinutes}
            />
          )}
        </div>

        <div>
          <JobHistory />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DashboardInner />
    </Suspense>
  )
}
