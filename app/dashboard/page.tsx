"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TextInput } from "@/components/TextInput"
import { TimeSelector } from "@/components/TimeSelector"
import { TypingProfileSelector } from "@/components/TypingProfileSelector"
import { FormatSelector } from "@/components/FormatSelector"
import { DocsSelector } from "@/components/DocsSelector"
import { PlaybackControls } from "@/components/PlaybackControls"
import { JobTemplates } from "@/components/JobTemplates"
import { CommandPalette } from "@/components/CommandPalette"
import { Confetti } from "@/components/ui/confetti"
import { useToast } from "@/components/ui/toast"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { formatDuration, calculateTimeRemaining } from "@/lib/utils"
import type { TypingProfile, JobStatus, DocumentFormat } from "@/types"

// WPM calculation based on typing profile
function calculateWPM(totalChars: number, durationMinutes: number, profile: TypingProfile): number {
  if (totalChars <= 0 || durationMinutes <= 0) return 0
  
  const baseWPM = (totalChars / 5) / durationMinutes
  
  const profileModifiers: Record<TypingProfile, { min: number; max: number }> = {
    steady: { min: 0.95, max: 1.05 },
    fatigue: { min: 0.6, max: 1.0 },
    burst: { min: 0.8, max: 1.2 },
    micropause: { min: 0.7, max: 0.9 },
  }
  
  const modifier = profileModifiers[profile]
  const avgModifier = (modifier.min + modifier.max) / 2
  
  return Math.round(baseWPM * avgModifier)
}

function calculateCurrentWPM(
  currentIndex: number, 
  totalChars: number, 
  elapsedMinutes: number, 
  profile: TypingProfile
): number {
  if (currentIndex <= 0 || elapsedMinutes <= 0) return 0
  const actualWPM = (currentIndex / 5) / elapsedMinutes
  return Math.round(actualWPM)
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 w-64 bg-white/5 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 bg-white/5 rounded-2xl" />
        <div className="lg:col-span-2 h-96 bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const jobIdParam = searchParams.get("jobId")
  const toast = useToast()
  const [showConfetti, setShowConfetti] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const [textContent, setTextContent] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [typingProfile, setTypingProfile] = useState<TypingProfile>("steady")
  const [documentFormat, setDocumentFormat] = useState<DocumentFormat>("mla")
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
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [jobTypingProfile, setJobTypingProfile] = useState<TypingProfile>("steady")
  const [jobStartTime, setJobStartTime] = useState<Date | null>(null)
  const [prevStatus, setPrevStatus] = useState<JobStatus>("pending")

  // Keep ref in sync with state
  useEffect(() => {
    currentJobIdRef.current = currentJobId
  }, [currentJobId])

  // Success celebration
  useEffect(() => {
    if (prevStatus !== "completed" && jobStatus === "completed") {
      setShowConfetti(true)
      toast.addToast("Job completed successfully! 🎉", "success")
    }
    setPrevStatus(jobStatus)
  }, [jobStatus, prevStatus, toast])

  // Calculate time remaining
  useEffect(() => {
    if (jobStatus === "running" && totalChars > 0) {
      const remaining = calculateTimeRemaining(totalChars, currentIndex, jobDurationMinutes)
      setTimeRemaining(remaining)
    } else if (jobStatus === "completed") {
      setTimeRemaining(0)
    }
  }, [jobStatus, currentIndex, totalChars, jobDurationMinutes])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "k",
      meta: true,
      handler: () => setCommandPaletteOpen(true),
    },
    {
      key: "Enter",
      ctrl: true,
      handler: () => {
        if (!currentJobId && textContent && documentId) {
          handleStart()
        }
      },
    },
    {
      key: " ",
      handler: () => {
        if (jobStatus === "running") {
          handlePause()
        } else if (jobStatus === "paused") {
          handleResume()
        }
      },
    },
    {
      key: "Escape",
      handler: () => {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false)
        } else if (currentJobId && (jobStatus === "running" || jobStatus === "paused")) {
          handleStop()
        }
      },
    },
  ])

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
        setJobTypingProfile(job.typingProfile as TypingProfile)
        setJobStartTime(new Date(job.createdAt))
      }
    } catch (error) {
      console.error("Failed to load job:", error)
      toast.addToast("Failed to load job", "error")
    }
  }, [toast])

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
      body: JSON.stringify({ title, format: documentFormat }),
    })

    if (!response.ok) {
      const data = await response.json()
      if (data.code === "GOOGLE_AUTH_REVOKED") {
        const errorMsg = "Please connect your Google account first"
        setError(errorMsg)
        toast.addToast(errorMsg, "error")
        throw new Error("Google authentication required")
      }
      throw new Error("Failed to create document")
    }

    const data = await response.json()
    toast.addToast(`Document created with ${documentFormat.toUpperCase()} formatting`, "success")
    return data.documentId
  }

  const handleStart = async () => {
    if (!textContent.trim()) {
      const errorMsg = "Please enter text to type"
      setError(errorMsg)
      toast.addToast(errorMsg, "warning")
      return
    }

    if (!documentId) {
      const errorMsg = "Please select or create a Google Document"
      setError(errorMsg)
      toast.addToast(errorMsg, "warning")
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
        const errorMsg = data.error || "Failed to start job"
        setError(errorMsg)
        toast.addToast(errorMsg, "error")
        return
      }

      const data = await response.json()
      setCurrentJobId(data.jobId)
      setJobStatus("running")
      setTotalChars(textContent.length)
      setJobDurationMinutes(durationMinutes)
      setJobTypingProfile(typingProfile)
      setJobStartTime(new Date())
      startProgressStream(data.jobId)
      
      toast.addToast("Job started successfully!", "success")
      router.push(`/dashboard?jobId=${data.jobId}`)
    } catch (error) {
      const errorMsg = "Failed to start job"
      setError(errorMsg)
      toast.addToast(errorMsg, "error")
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
        toast.addToast("Job paused", "info")
      } else {
        toast.addToast("Failed to pause job", "error")
      }
    } catch (error) {
      toast.addToast("Failed to pause job", "error")
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
        toast.addToast("Job resumed", "success")
      } else {
        toast.addToast("Failed to resume job", "error")
      }
    } catch (error) {
      toast.addToast("Failed to resume job", "error")
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
        toast.addToast("Job stopped", "info")
      } else {
        toast.addToast("Failed to stop job", "error")
      }
    } catch (error) {
      toast.addToast("Failed to stop job", "error")
    } finally {
      setLoading(false)
    }
  }

  const progress = totalChars > 0 ? (currentIndex / totalChars) * 100 : 0
  
  const elapsedMinutes = jobStartTime 
    ? (Date.now() - jobStartTime.getTime()) / (1000 * 60) 
    : 0
  
  const displayWPM = jobStatus === "running" && elapsedMinutes > 0.1
    ? calculateCurrentWPM(currentIndex, totalChars, elapsedMinutes, jobTypingProfile)
    : calculateWPM(totalChars, jobDurationMinutes, jobTypingProfile)

  const estimatedWPM = calculateWPM(textContent.length || 1000, durationMinutes, typingProfile)

  const statusConfig: Record<JobStatus, { color: string; bg: string; label: string }> = {
    pending: { color: "text-yellow-900", bg: "bg-yellow-50", label: "Pending" },
    running: { color: "text-green-900", bg: "bg-green-50", label: "Running" },
    paused: { color: "text-amber-900", bg: "bg-amber-50", label: "Paused" },
    completed: { color: "text-black", bg: "bg-gray-100", label: "Completed" },
    failed: { color: "text-red-900", bg: "bg-red-50", label: "Failed" },
    stopped: { color: "text-gray-900", bg: "bg-gray-100", label: "Stopped" },
    expired: { color: "text-orange-900", bg: "bg-orange-50", label: "Expired" },
  }

  return (
    <>
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onStartJob={handleStart}
        onPauseJob={handlePause}
        onResumeJob={handleResume}
        onStopJob={handleStop}
        hasActiveJob={!!currentJobId}
        jobStatus={jobStatus}
      />
      
      <div className="space-y-6 md:space-y-8">
        {/* Hero Section - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-black">
              TypeFlow Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-sm md:text-base">
              Transform your text into natural, human-like typing.
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 transition-all text-sm"
              title="Open command palette (Cmd+K)"
            >
              <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-black text-xs">
                ⌘K
              </kbd>
            </button>
            
            <Link
              href="/dashboard/history"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 transition-all text-sm"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">History</span>
            </Link>
            
            {currentJobId && (
              <div className={`flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 rounded-lg ${statusConfig[jobStatus].bg} border border-black`}>
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${statusConfig[jobStatus].color.replace('text-', 'bg-')} ${jobStatus === 'running' ? 'animate-pulse' : ''}`} />
                <span className={`font-semibold text-sm md:text-base ${statusConfig[jobStatus].color}`}>
                  {statusConfig[jobStatus].label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert - Mobile Optimized */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-800 p-4 flex items-start gap-3" role="alert">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-red-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-900 text-sm md:text-base flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Stats Cards - Mobile Grid */}
        {currentJobId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              label="Progress"
              value={`${progress.toFixed(1)}%`}
              icon={
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              color="black"
            />
            <StatCard
              label="Characters"
              value={`${currentIndex.toLocaleString()} / ${totalChars.toLocaleString()}`}
              icon={
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              color="black"
            />
            <StatCard
              label="Time Left"
              value={formatDuration(Math.ceil(timeRemaining))}
              icon={
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="black"
            />
            <StatCard
              label="Speed"
              value={`${displayWPM} WPM`}
              subtext={jobTypingProfile.charAt(0).toUpperCase() + jobTypingProfile.slice(1)}
              icon={
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              color="black"
            />
          </div>
        )}

        {/* Progress Bar - Mobile Optimized */}
        {currentJobId && (
          <div className="bg-white border border-black rounded-lg p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <span className="text-black text-sm md:text-base">Overall Progress</span>
              <span className="text-black font-mono text-sm md:text-base">{progress.toFixed(1)}%</span>
            </div>
            <div className="relative h-3 md:h-4 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-black rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {jobStatus === "running" && (
              <p className="text-xs md:text-sm text-gray-600 mt-2 md:mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                Typing at ~{displayWPM} WPM
              </p>
            )}
          </div>
        )}

        {/* Main Grid - Mobile Stack, Desktop Side-by-Side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - New Job Form */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="bg-white border border-black rounded-lg overflow-hidden shadow-sm">
              <div className="p-4 md:p-6 border-b border-black flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg md:text-xl font-semibold text-black flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-black flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  New Typing Job
                </h2>
                
                {textContent.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-black">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs md:text-sm text-white">
                      ~{estimatedWPM} WPM
                    </span>
                  </div>
                )}
              </div>
              
              <div className="p-4 md:p-6 space-y-5 md:space-y-6">
                <JobTemplates
                  onSelect={(template) => {
                    // Generate sample text based on template
                    const sampleText = Array.from({ length: template.textLength }, (_, i) => {
                      const words = ["Lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua"]
                      return words[i % words.length]
                    }).join(" ") + "."
                    
                    setTextContent(sampleText)
                    setDurationMinutes(template.durationMinutes)
                    setTypingProfile(template.profile)
                    toast.addToast(`${template.name} template applied`, "success")
                  }}
                />

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

                <FormatSelector
                  value={documentFormat}
                  onChange={setDocumentFormat}
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
              </div>
            </div>
          </div>

          {/* Right Column - Google Doc Preview */}
          <div className="space-y-6 order-1 lg:order-2">
              {documentId ? (
              <div className="bg-white border border-black rounded-lg overflow-hidden shadow-sm">
                <div className="p-3 md:p-4 border-b border-black flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base md:text-lg font-semibold text-black flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-black flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="hidden sm:inline">Live Document Preview</span>
                    <span className="sm:hidden">Preview</span>
                  </h2>
                  <a 
                    href={`https://docs.google.com/document/d/${documentId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs md:text-sm text-black hover:text-gray-700 flex items-center gap-1 md:gap-2"
                  >
                    <span className="hidden sm:inline">Open in Google Docs</span>
                    <span className="sm:hidden">Open</span>
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <div className="relative">
                  <iframe
                    src={`https://docs.google.com/document/d/${documentId}/edit?embedded=true`}
                    className="w-full h-[400px] md:h-[500px] lg:h-[600px] border-0 bg-white"
                    title="Google Doc Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  {jobStatus === "running" && (
                    <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4 flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-black border border-black shadow-sm">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs md:text-sm text-white font-medium">{displayWPM} WPM</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-black rounded-lg p-8 md:p-12 text-center shadow-sm">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-black mb-2">No Document Selected</h3>
                <p className="text-gray-600 text-sm md:text-base max-w-sm mx-auto">
                  Select or create a Google Document to see the live preview here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Stat Card Component - Mobile Optimized
interface StatCardProps {
  label: string
  value: string
  subtext?: string
  icon: React.ReactNode
  color: "black"
}

function StatCard({ label, value, subtext, icon, color }: StatCardProps) {
  return (
    <div className="rounded-lg p-3 md:p-5 bg-white border border-black shadow-sm">
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-black text-white flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-lg md:text-2xl font-bold text-black break-words">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs md:text-sm text-gray-600">{label}</p>
        {subtext && <p className="text-xs text-gray-500 hidden sm:inline">{subtext}</p>}
      </div>
    </div>
  )
}
