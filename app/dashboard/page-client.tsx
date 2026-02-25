"use client"

import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useJobPolling } from "@/hooks/useJobPolling"
import { usePaymentFlow } from "@/hooks/usePaymentFlow"
import { useDocumentManager } from "@/hooks/useDocumentManager"
import { TextInput } from "@/components/TextInput"
import { TimeSelector } from "@/components/TimeSelector"
import { TypingProfileSelector } from "@/components/TypingProfileSelector"
import { FormatSelector } from "@/components/FormatSelector"
import type { CustomFormatConfig } from "@/components/CustomFormatModal"
import { DocsSelector } from "@/components/DocsSelector"
import { PlaybackControls } from "@/components/PlaybackControls"
import { DocumentStats } from "@/components/DocumentStats"
import { Confetti } from "@/components/ui/confetti"
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"
import { FormatMetadataModal } from "@/components/FormatMetadataModal"
import { CustomFormatModal } from "@/components/CustomFormatModal"
import { useToast } from "@/components/ui/toast"
import { AcademicIntegrityGate } from "@/components/AcademicIntegrityGate"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { formatDuration } from "@/lib/utils"
import { scoreWPM, computeHumanScore } from "@/lib/scoring"
import { JobReportModal } from "@/components/JobReportModal"
import { useDashboardTheme } from "./theme-context"
import type { TypingProfile, JobStatus, DocumentFormat } from "@/types"
import type { FormatMetadata } from "@/components/FormatMetadataModal"

// WPM calculation — returns the actual WPM the engine is configured to target.
// All profiles use the same durationMinutes target; the profile only changes the
// rhythm/style (burst cadence, fatigue curve, etc.), not the average speed.
function calculateWPM(totalChars: number, durationMinutes: number, profile: TypingProfile, testWPM?: number): number {
  if (totalChars <= 0 || durationMinutes <= 0) return 0

  if (profile === "typing-test" && testWPM) {
    return testWPM
  }

  return Math.round((totalChars / 5) / durationMinutes)
}

function calculateCurrentWPM(
  currentIndex: number,
  totalChars: number,
  elapsedMinutes: number,
  profile: TypingProfile,
  testWPM?: number
): number {
  if (currentIndex <= 0 || elapsedMinutes <= 0) return 0
  const actualWPM = (currentIndex / 5) / elapsedMinutes
  return Math.round(actualWPM)
}


export default function DashboardPageClient() {
  return (
    <AcademicIntegrityGate>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </AcademicIntegrityGate>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 w-64 bg-white/10 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 bg-white/5 rounded-2xl" />
        <div className="lg:col-span-2 h-96 bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}

function PaymentProcessingModal({
  isDark,
  remainingSeconds,
  onContinue,
}: {
  isDark: boolean
  remainingSeconds: number
  onContinue: () => void
}) {
  const [showContinue, setShowContinue] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setShowContinue(true), 10_000) // After 10s, allow dismiss so user is never stuck
    return () => clearTimeout(id)
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl border p-8 w-full max-w-[90vw] sm:max-w-md mx-4 ${
        isDark ? "bg-black border-white/20" : "bg-white border-black/10"
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="text-center space-y-2">
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-black"}`}>
              Finalizing your access...
            </h3>
            <p className={`text-sm ${isDark ? "text-white/70" : "text-black/70"}`}>
              Your payment was successful! We're processing your subscription.
              {remainingSeconds > 0 && (
                <span className="block mt-2 text-xs">
                  This may take up to {remainingSeconds} seconds...
                </span>
              )}
            </p>
          </div>
          {showContinue && (
            <div className="flex flex-col items-center gap-2 w-full">
              <p className={`text-xs ${isDark ? "text-white/50" : "text-black/50"}`}>
                Taking longer? Your access will update shortly.
              </p>
              <button
                type="button"
                onClick={onContinue}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark
                    ? "bg-white/15 hover:bg-white/25 text-white"
                    : "bg-black/10 hover:bg-black/20 text-black"
                }`}
              >
                Continue to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const toast = useToast()
  const { isDark } = useDashboardTheme()
  const [showConfetti, setShowConfetti] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showMetadataModal, setShowMetadataModal] = useState(false)
  const [showCustomFormatModal, setShowCustomFormatModal] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)

  // Payment flow hook
  const {
    session,
    status,
    isProcessingPayment,
    remainingSeconds,
    handleContinue: handlePaymentContinue,
  } = usePaymentFlow({
    toast,
    onSuccess: () => setShowConfetti(true),
  })

  // Redirect to home page if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Job polling hook
  const {
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
    setCurrentJobId,
    setJobStatus,
    setTotalChars,
    setJobDurationMinutes,
    setJobTypingProfile,
    setJobTestWPM,
    setJobStartTime,
    setIndexAtLoad,
    startProgressStream,
    resetJobState,
  } = useJobPolling({ toast })

  const [textContent, setTextContent] = useState("")

  // Pre-populate text from AI Chat "Send to Typer" action
  useEffect(() => {
    const pending = sessionStorage.getItem("ai_pending_text")
    if (pending) {
      setTextContent(pending)
      sessionStorage.removeItem("ai_pending_text")
    }
  }, [])

  const [durationMinutes, setDurationMinutes] = useState(30)
  const [typingProfile, setTypingProfile] = useState<TypingProfile>("steady")
  const [testWPM, setTestWPM] = useState<number | undefined>(undefined)
  // Admin-controlled list of visible typing profiles for this user's tier
  const [visibleProfiles, setVisibleProfiles] = useState<string[]>(["steady"])
  const [documentFormat, setDocumentFormat] = useState<DocumentFormat>("mla")
  const [formatMetadata, setFormatMetadata] = useState<FormatMetadata | undefined>(undefined)
  const [customFormatConfig, setCustomFormatConfig] = useState<CustomFormatConfig | undefined>(undefined)
  const [documentId, setDocumentId] = useState("")
  const { documentUrl, loadingDocumentUrl, iframeError, setIframeError } = useDocumentManager(documentId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTextInput, setShowTextInput] = useState(true)

  // Show text input if text exists
  useEffect(() => {
    if (textContent && !showTextInput) {
      setShowTextInput(true)
    }
  }, [textContent, showTextInput])

  // Fetch admin-configured visible profiles for this user's tier
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/profiles/enabled")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) {
          setVisibleProfiles(data as string[])
          // If the selected profile is no longer visible, reset to steady
          setTypingProfile((prev) =>
            (data as string[]).includes(prev) ? prev : "steady"
          )
          if (!(data as string[]).includes("typing-test")) {
            setTestWPM(undefined)
          }
        }
      })
      .catch(() => {})
  }, [status])

  const [prevStatus, setPrevStatus] = useState<JobStatus>("pending")

  // Success celebration
  useEffect(() => {
    if (prevStatus !== "completed" && jobStatus === "completed") {
      setShowConfetti(true)
      toast.addToast("Job completed successfully! 🎉", "success")
      setShowReport(true)
      // Browser notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("TypeFlow — Typing complete!", {
          body: `${totalChars.toLocaleString()} characters typed into your document.`,
          icon: "/icon-192.png",
        })
      }
    }
    setPrevStatus(jobStatus)
  }, [jobStatus, prevStatus, toast, totalChars])

  // Time remaining = proportion of text not yet typed × configured duration.
  // This ensures the timer always reflects how much text is left rather than
  // wall-clock elapsed time — so it never hits 0 while typing is still going,
  // regardless of whether the engine is faster or slower than the target WPM.
  const timeRemaining =
    jobStatus === "completed"
      ? 0
      : totalChars > 0 && currentJobId
      ? (Math.max(0, totalChars - currentIndex) / totalChars) * jobDurationMinutes
      : jobDurationMinutes

  // Keyboard shortcuts
  useKeyboardShortcuts([
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
        if (currentJobId && (jobStatus === "running" || jobStatus === "paused")) {
          handleStop()
        }
      },
    },
  ])

  // Sync form state when the job polling hook loads a job or resets
  useEffect(() => {
    if (!jobIdParam) {
      // When navigating away from a job to a fresh dashboard, wipe all form fields
      if (typeof prevJobIdRef.current === "string") {
        setTextContent("")
        setDocumentId("")
        setDurationMinutes(30)
        setTypingProfile("steady")
        setTestWPM(undefined)
        setDocumentFormat("mla")
        setFormatMetadata(undefined)
        setCustomFormatConfig(undefined)
        setError(null)
        setScheduledAt("")
        setShowSchedulePicker(false)
      }
    }
  }, [jobIdParam])

  // When a job is loaded via URL param, also restore form fields from the job data.
  // useJobPolling.loadJob handles the core state; this handles form-specific fields.
  useEffect(() => {
    if (!jobIdParam) return
    // Fetch job data to restore form state (loadJob in the hook already ran)
    fetch(`/api/jobs/${jobIdParam}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.job) return
        const job = data.job
        setDocumentId(job.documentId)
        if (job.textContent) setTextContent(job.textContent)
        setDurationMinutes(job.durationMinutes)
        setTypingProfile(job.typingProfile as TypingProfile)
        setTestWPM(job.testWPM ? Number(job.testWPM) : undefined)
      })
      .catch(() => {})
  }, [jobIdParam])

  const handleCreateDocument = async (title: string): Promise<string> => {
    try {
      const response = await fetch("/api/google-docs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          format: documentFormat,
          formatMetadata: formatMetadata,
          customFormatConfig: customFormatConfig,
        }),
      })

      if (!response.ok) {
        let data: { error?: string; code?: string } = {}
        let errorMsg = "Failed to create document"

        try {
          const responseText = await response.text()
          if (responseText) {
            data = JSON.parse(responseText) as { error?: string; code?: string }
            errorMsg = data.error || errorMsg
          }
        } catch (parseError) {
          errorMsg = `Server error (${response.status})`
        }

        if (data.code === "GOOGLE_AUTH_REVOKED" || response.status === 401) {
          errorMsg = "Please connect your Google account first"
        }
        
        setError(errorMsg)
        toast.addToast(errorMsg, "error")
        throw new Error(errorMsg)
      }

      const data = await response.json()
      toast.addToast(`Document created with ${documentFormat.toUpperCase()} formatting`, "success")
      return data.documentId
    } catch (error: unknown) {
      // Re-throw if it's already our error
      if (error instanceof Error && error.message !== "Failed to create document") {
        throw error
      }
      
      // Handle network errors
      const errorMsg = "Failed to create document. Please check your connection."
      setError(errorMsg)
      toast.addToast(errorMsg, "error")
      throw new Error(errorMsg)
    }
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
      // Request notification permission before starting
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission()
      }

      const isScheduledStart = scheduledAt && new Date(scheduledAt) > new Date()
      const response = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textContent,
          durationMinutes,
          typingProfile,
          documentId,
          testWPM: typingProfile === "typing-test" ? testWPM : undefined,
          scheduledAt: isScheduledStart ? scheduledAt : undefined,
        }),
      })

      if (!response.ok) {
        let data: { message?: string; error?: string } = {}
        let errorMsg = "Failed to start job"

        try {
          const responseText = await response.text()
          if (responseText) {
            data = JSON.parse(responseText) as { message?: string; error?: string }
            errorMsg = data.message || data.error || errorMsg
          }
        } catch (parseError) {
          errorMsg = `Server error (${response.status})`
        }
        
        setError(errorMsg)
        toast.addToast(errorMsg, "error")
        return
      }

      const data = await response.json()
      setCurrentJobId(data.jobId)
      setJobStatus(isScheduledStart ? "scheduled" : "running")
      setTotalChars(textContent.length)
      setJobDurationMinutes(durationMinutes)
      setJobTypingProfile(typingProfile)
      setJobTestWPM(testWPM)
      setJobStartTime(new Date())
      setIndexAtLoad(0)
      if (!isScheduledStart) startProgressStream(data.jobId)
      window.dispatchEvent(new CustomEvent("typeflow:job-status-changed"))
      setScheduledAt("")
      setShowSchedulePicker(false)

      if (isScheduledStart) {
        const formatted = new Date(scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
        toast.addToast(`Job scheduled for ${formatted}`, "success")
      } else {
        toast.addToast("Job started successfully!", "success")
      }
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

    // Optimistic update — change status immediately so the UI responds instantly
    setJobStatus("paused")
    try {
      const response = await fetch("/api/jobs/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId }),
      })
      if (response.ok) {
        window.dispatchEvent(new CustomEvent("typeflow:job-status-changed"))
        toast.addToast("Job paused", "info")
      } else {
        setJobStatus("running") // revert on failure
        toast.addToast("Failed to pause job", "error")
      }
    } catch {
      setJobStatus("running")
      toast.addToast("Failed to pause job", "error")
    }
  }

  const handleResume = async () => {
    if (!currentJobId) return

    // Optimistic update
    setJobDurationMinutes(durationMinutes)
    setJobStatus("running")
    startProgressStream(currentJobId)
    try {
      const response = await fetch("/api/jobs/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId, durationMinutes }),
      })
      if (response.ok) {
        window.dispatchEvent(new CustomEvent("typeflow:job-status-changed"))
        toast.addToast("Job resumed", "success")
      } else {
        setJobStatus("paused") // revert on failure
        toast.addToast("Failed to resume job", "error")
      }
    } catch {
      setJobStatus("paused")
      toast.addToast("Failed to resume job", "error")
    }
  }

  const handleStop = async () => {
    if (!currentJobId) return

    // Optimistic update — change status immediately so the UI responds instantly
    const prevStatus = jobStatus
    const prevJobId = currentJobId
    setJobStatus("stopped")
    setCurrentJobId(null)
    try {
      const response = await fetch("/api/jobs/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: prevJobId }),
      })
      if (response.ok) {
        window.dispatchEvent(new CustomEvent("typeflow:job-status-changed"))
        toast.addToast("Job stopped", "info")
      } else {
        setJobStatus(prevStatus) // revert on failure
        setCurrentJobId(prevJobId)
        toast.addToast("Failed to stop job", "error")
      }
    } catch {
      setJobStatus(prevStatus)
      setCurrentJobId(prevJobId)
      toast.addToast("Failed to stop job", "error")
    }
  }

  const isJobActive = !!currentJobId && jobStatus === "running"

  const progress = totalChars > 0 ? (currentIndex / totalChars) * 100 : 0
  
  const elapsedMinutes = jobStartTime 
    ? (Date.now() - jobStartTime.getTime()) / (1000 * 60) 
    : 0
  
  const charsThisSession = Math.max(0, currentIndex - indexAtLoad)
  const displayWPM = jobStatus === "running" && elapsedMinutes > 0.1 && charsThisSession > 0
    ? calculateCurrentWPM(charsThisSession, totalChars, elapsedMinutes, jobTypingProfile, jobTestWPM)
    : calculateWPM(totalChars, jobDurationMinutes, jobTypingProfile, jobTestWPM)

  const estimatedWPM = calculateWPM(textContent.length || 1000, durationMinutes, typingProfile, testWPM)

  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0
  const inlineDuration = formatDuration(durationMinutes)
  const inlineProfileLabel = typingProfile === "typing-test" && testWPM
    ? `${testWPM} WPM`
    : typingProfile.charAt(0).toUpperCase() + typingProfile.slice(1).replace("-", " ")

  const statusConfig: Record<JobStatus, { color: string; bg: string; label: string }> = {
    pending: { color: "text-yellow-900", bg: "bg-yellow-50", label: "Pending" },
    running: { color: "text-green-900", bg: "bg-green-50", label: "Running" },
    paused: { color: "text-amber-900", bg: "bg-amber-50", label: "Paused" },
    completed: { color: "text-black", bg: "bg-gray-100", label: "Completed" },
    failed: { color: "text-red-900", bg: "bg-red-50", label: "Failed" },
    stopped: { color: "text-gray-900", bg: "bg-gray-100", label: "Stopped" },
    expired: { color: "text-orange-900", bg: "bg-orange-50", label: "Expired" },
    scheduled: { color: "text-blue-900", bg: "bg-blue-50", label: "Scheduled" },
  }


  return (
    <>
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      <JobReportModal
        isOpen={showReport}
        onClose={() => { setShowReport(false); resetJobState() }}
        jobId={currentJobId}
        totalChars={totalChars}
        isDark={isDark}
      />

      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <PaymentProcessingModal
          isDark={isDark}
          remainingSeconds={remainingSeconds}
          onContinue={handlePaymentContinue}
        />
      )}
      
      <DocumentPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        text={textContent}
        format={documentFormat}
        formatMetadata={formatMetadata}
        customFormatConfig={customFormatConfig}
      />
      <FormatMetadataModal
        isOpen={showMetadataModal}
        format={documentFormat}
        onClose={() => setShowMetadataModal(false)}
        onSave={(metadata) => {
          setFormatMetadata(metadata)
          setShowMetadataModal(false)
        }}
        initialMetadata={formatMetadata}
      />
      <CustomFormatModal
        isOpen={showCustomFormatModal}
        onClose={() => setShowCustomFormatModal(false)}
        onSave={(config) => {
          setCustomFormatConfig(config)
          setShowCustomFormatModal(false)
        }}
        initialConfig={customFormatConfig}
      />
      
          <div className="space-y-6 md:space-y-8 pb-6 w-full max-w-full overflow-x-hidden min-w-0">

          <AnimatePresence>
          {currentJobId && (
            <motion.div
              key="job-status-badge"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex flex-wrap items-center gap-3"
            >
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-black/5 border-black/10"
              }`}>
                <div className={`w-2 h-2 rounded-full ${statusConfig[jobStatus].color.replace('text-', 'bg-')} ${jobStatus === 'running' ? 'animate-pulse' : ''}`} />
                <span className={`font-semibold text-sm ${
                  isDark ? "text-white" : "text-black"
                }`}>
                  {statusConfig[jobStatus].label}
                </span>
              </div>
              <div className={`text-xs md:text-sm ${
                isDark ? "text-white/60" : "text-black/60"
              }`}>
                {jobStatus === "running"
                  ? `Typing at ~${displayWPM} WPM${jobTypingProfile === "typing-test" && jobTestWPM ? ` (test: ${jobTestWPM} WPM)` : ""}`
                  : jobStatus === "paused"
                  ? "Paused"
                  : jobStatus === "completed"
                  ? "Completed"
                  : "Pending"}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

        {/* Error Alert - Mobile Optimized */}
        <AnimatePresence>
        {error && (
          <motion.div
            key="error-alert"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`rounded-lg border p-4 flex items-start gap-3 ${
            isDark
              ? "bg-red-900/20 border-red-500/70"
              : "bg-red-50 border-red-300"
          }`} role="alert">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isDark ? "bg-red-500/20" : "bg-red-100"
            }`}>
              <svg className={`w-4 h-4 md:w-5 md:h-5 ${
                isDark ? "text-red-300" : "text-red-600"
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className={`text-sm md:text-base flex-1 ${
              isDark ? "text-red-100" : "text-red-800"
            }`}>{error}</p>
            <button onClick={() => setError(null)} className={`flex-shrink-0 ${
              isDark ? "text-red-200 hover:text-red-100" : "text-red-600 hover:text-red-700"
            }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Stats Cards - Simplified */}
        <AnimatePresence>
        {currentJobId && (
          <motion.div
            key="job-stats-cards"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
          >
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
              value={formatDuration(timeRemaining)}
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
              subtext={jobTypingProfile === "typing-test" && jobTestWPM 
                ? `${jobTestWPM} WPM`
                : jobTypingProfile.charAt(0).toUpperCase() + jobTypingProfile.slice(1).replace("-", " ")}
              icon={
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              color="black"
            />
          </motion.div>
        )}
        </AnimatePresence>

        {/* Progress Bar - Simplified */}
        <AnimatePresence>
        {currentJobId && (
          <motion.div
            key="job-progress-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
            className="space-y-3"
            role="region"
            aria-label="Job progress"
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm ${
                isDark ? "text-white" : "text-black"
              }`}>
                Progress
              </span>
              <span className={`font-mono text-sm ${
                isDark ? "text-white" : "text-black"
              }`}>
                {progress.toFixed(1)}%
              </span>
            </div>
            <div 
              className={`relative h-2 rounded-full overflow-hidden ${
                isDark ? "bg-white/10" : "bg-black/10"
              }`}
              role="progressbar"
              aria-valuenow={currentIndex}
              aria-valuemin={0}
              aria-valuemax={totalChars}
              aria-label={`Typing progress: ${progress.toFixed(1)}% complete`}
            >
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                  isDark ? "bg-white" : "bg-black"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {jobStatus === "running" && (
              <p className={`text-xs flex items-center gap-2 ${
                isDark ? "text-white/60" : "text-black/60"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isDark ? "bg-green-400" : "bg-green-600"
                }`} />
                Typing at ~{displayWPM} WPM{jobTypingProfile === "typing-test" && jobTestWPM ? ` (test: ${jobTestWPM} WPM)` : ""}
              </p>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Main Layout - Two Column on Desktop */}
        <div className="w-full max-w-full min-w-0 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-stretch">
          {/* LEFT COLUMN: Form Controls */}
          <div className="space-y-3 md:space-y-4 min-w-0">
          {/* Section 1: Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-white/40" : "text-black/40"}`}>Content</p>
              <span className={`text-xs tabular-nums ${isDark ? "text-white/30" : "text-black/30"}`}>
                {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
              </span>
            </div>
            <div className={isJobActive ? "pointer-events-none opacity-50" : ""}>
              <TextInput
                value={textContent}
                onChange={setTextContent}
                maxChars={50000}
              />
            </div>
            {textContent && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(textContent)
                      toast.addToast("Text copied to clipboard", "success")
                    } catch {
                      toast.addToast("Failed to copy text", "error")
                    }
                  }}
                  className={`text-xs underline-offset-2 hover:underline ${
                    isDark ? "text-white/60 hover:text-white/80" : "text-black/60 hover:text-black/80"
                  }`}
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Sections 2, 3, Advanced — locked while job is active */}
          <div className={isJobActive ? "pointer-events-none opacity-50 select-none" : ""}>

          {/* Section 2: Destination */}
          <div className={`pt-4 border-t ${
            isDark ? "border-white/10" : "border-black/10"
          }`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? "text-white/40" : "text-black/40"}`}>Destination</p>
            <DocsSelector
              value={documentId}
              onChange={setDocumentId}
              onCreateNew={handleCreateDocument}
            />
          </div>

          {/* Section 3: Settings */}
          <div className={`pt-4 border-t ${
            isDark ? "border-white/10" : "border-black/10"
          } space-y-4`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-white/40" : "text-black/40"}`}>Settings</p>
              {isJobActive && (
                <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  isDark ? "text-white/35 bg-white/5" : "text-black/35 bg-black/5"
                }`}>
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked
                </span>
              )}
            </div>
            <TimeSelector
              value={durationMinutes}
              onChange={setDurationMinutes}
            />

            <TypingProfileSelector
              value={typingProfile}
              onChange={(profile, wpm) => {
                setTypingProfile(profile)
                setTestWPM(wpm)
                if (profile !== "typing-test") {
                  setTestWPM(undefined)
                }
              }}
              testWPM={testWPM}
              userTier={session?.user?.planTier || "FREE"}
              visibleProfiles={visibleProfiles}
            />
          </div>

          {/* Pre-Flight Analysis */}
          {wordCount > 0 && (
            <PreFlightAnalysis
              wpm={estimatedWPM}
              wordCount={wordCount}
              durationMinutes={durationMinutes}
              profile={typingProfile}
              isDark={isDark}
            />
          )}

          {/* Secondary: Advanced Options - Accordion */}
          <div className={`pt-4 border-t ${
            isDark ? "border-white/5" : "border-black/5"
          }`}>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`flex items-center gap-2 text-xs transition-colors w-full py-1 ${
                isDark
                  ? "text-white/50 hover:text-white/70"
                  : "text-black/50 hover:text-black/70"
              }`}
              aria-expanded={showAdvanced}
            >
              <motion.svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                animate={{ rotate: showAdvanced ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </motion.svg>
              <span>
                {showAdvanced
                  ? "Hide advanced options"
                  : "Advanced options"}
              </span>
            </button>

            <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
              <div className="mt-4 space-y-3">
                <FormatSelector
                  value={documentFormat}
                  onChange={(format, metadata, customConfig) => {
                    setDocumentFormat(format)
                    if (metadata) {
                      setFormatMetadata(metadata)
                    }
                    if (customConfig) {
                      setCustomFormatConfig(customConfig)
                    }
                    if (format !== "custom") {
                      setCustomFormatConfig(undefined)
                    }
                    if (format === "none" || format === "custom") {
                      setFormatMetadata(undefined)
                    }
                  }}
                  formatMetadata={formatMetadata}
                  customFormatConfig={customFormatConfig}
                />

                {documentFormat === "mla" && (
                  <button
                    onClick={() => setShowMetadataModal(true)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors text-xs ${
                      formatMetadata && 
                      formatMetadata.studentName && 
                      formatMetadata.professorName && 
                      formatMetadata.courseName && 
                      formatMetadata.date &&
                      formatMetadata.title
                        ? isDark
                          ? "bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
                          : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                        : isDark
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                        : "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                    }`}
                    aria-label="Configure MLA format requirements"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-xs font-medium">
                      {formatMetadata && 
                      formatMetadata.studentName && 
                      formatMetadata.professorName && 
                      formatMetadata.courseName && 
                      formatMetadata.date &&
                      formatMetadata.title
                        ? "MLA Configured"
                        : "Configure MLA"}
                    </span>
                  </button>
                )}

                {/* Preview formatted text - only show if formatting is not "none" */}
                {textContent && documentFormat !== "none" && (
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors text-xs ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                        : "bg-black/5 border-black/10 text-black/70 hover:bg-black/10 hover:text-black"
                    }`}
                    aria-label="Preview document"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span className="text-xs font-medium">Preview formatted text</span>
                  </button>
                )}
              </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          </div>{/* end lock wrapper */}

          {/* Mobile: Open document link (hidden on desktop — right col handles it) */}
          {documentId && (
            <div className="lg:hidden pt-2">
              <a
                href={documentUrl || `https://docs.google.com/document/d/${documentId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                    : "bg-black/5 border-black/20 text-black hover:bg-black/10"
                } ${loadingDocumentUrl ? "opacity-50 cursor-wait" : ""}`}
                onClick={(e) => { if (loadingDocumentUrl) e.preventDefault() }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-sm font-medium">Open in Google Docs</span>
              </a>
            </div>
          )}
          </div>{/* end left column */}

          {/* RIGHT COLUMN: Sticky Start Card + Live Preview */}
          <div className="hidden lg:block min-w-0">
            <div className="sticky top-24" style={{ height: "calc(100vh - 6rem)" }}>

              <AnimatePresence mode="wait">
              {textContent.trim() && documentId ? (
                /* READY STATE */
                <motion.div
                  key="ready-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full overflow-y-auto flex flex-col gap-5 pr-1"
                >
                  {/* Ready to start card */}
                  <div className={`rounded-xl border p-5 space-y-4 ${
                    isDark ? "bg-white/5 border-white/10" : "bg-black/[0.03] border-black/10"
                  }`}>
                    <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-white/40" : "text-black/40"}`}>Ready to start</p>
                    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${isDark ? "text-white/70" : "text-black/70"}`}>
                      <span className="font-medium">{wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}</span>
                      <span className="opacity-40">·</span>
                      <span>{inlineDuration}</span>
                      <span className="opacity-40">·</span>
                      <span className="capitalize">{inlineProfileLabel}</span>
                      {documentFormat !== "none" && (
                        <>
                          <span className="opacity-40">·</span>
                          <span className="uppercase text-xs">{documentFormat === "mla" ? "MLA" : "Custom"}</span>
                        </>
                      )}
                    </div>
                    {/* Schedule for later toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowSchedulePicker(v => !v)}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${isDark ? "text-white/50 hover:text-white/80" : "text-black/40 hover:text-black/70"}`}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${showSchedulePicker ? "rotate-90" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Schedule for later
                      </button>
                      {showSchedulePicker && (
                        <div className="mt-2">
                          <input
                            type="datetime-local"
                            value={scheduledAt}
                            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                            max={new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16)}
                            onChange={e => setScheduledAt(e.target.value)}
                            className={`text-xs rounded-lg px-2.5 py-1.5 border outline-none transition-colors ${
                              isDark
                                ? "bg-gray-800 border-gray-600 text-gray-200 focus:border-blue-400"
                                : "bg-white border-gray-300 text-gray-800 focus:border-blue-500"
                            }`}
                          />
                          {scheduledAt && (
                            <button
                              type="button"
                              onClick={() => setScheduledAt("")}
                              className={`ml-2 text-xs ${isDark ? "text-white/40 hover:text-white/70" : "text-black/40 hover:text-black/70"}`}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <PlaybackControls
                        status={jobStatus}
                        onStart={handleStart}
                        onPause={handlePause}
                        onResume={handleResume}
                        onStop={handleStop}
                        disabled={loading || !textContent.trim() || !documentId}
                      />
                      <a
                        href={documentUrl || `https://docs.google.com/document/d/${documentId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm flex items-center gap-1.5 transition-colors ${
                          isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"
                        } ${loadingDocumentUrl ? "opacity-50 cursor-wait" : ""}`}
                        onClick={(e) => { if (loadingDocumentUrl) e.preventDefault() }}
                      >
                        <span>Open in Google Docs</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Live preview (inside ready state scroll container) */}
                  {documentId && (
                <div className="space-y-3">
                  <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-white/40" : "text-black/40"}`}>Document preview</p>
                  <div className={`relative rounded-lg overflow-hidden border ${
                    isDark ? "border-white/10" : "border-black/10"
                  }`}>
                    {documentUrl && !iframeError ? (
                      <iframe
                        src={`${documentUrl}?embedded=true`}
                        className="w-full h-[600px] lg:h-[700px] border-0 bg-white"
                        title="Google Doc Preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        onError={() => setIframeError(true)}
                      />
                    ) : (
                      <div className={`w-full h-[600px] lg:h-[700px] flex items-center justify-center ${
                        isDark ? "bg-black/20" : "bg-gray-50"
                      }`}>
                        <div className="text-center space-y-4">
                          <p className={`text-sm ${isDark ? "text-white/70" : "text-black/70"}`}>
                            {iframeError
                              ? "Document preview unavailable. Please open in Google Docs."
                              : loadingDocumentUrl
                                ? "Loading document..."
                                : "Document preview unavailable"}
                          </p>
                          {(documentUrl || documentId) && (
                            <a
                              href={documentUrl || `https://docs.google.com/document/d/${documentId}/edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                isDark
                                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                  : "bg-black/5 border-black/20 text-black hover:bg-black/10"
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span className="text-sm font-medium">Open in Google Docs</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {jobStatus === "running" && (
                      <div className={`absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm ${
                        isDark ? "bg-black/80 border-white/10" : "bg-white/95 border-black/10"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? "bg-green-400" : "bg-green-600"}`} />
                        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-black"}`}>
                          {displayWPM} WPM
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                  )}
                </motion.div>
              ) : (
                /* PLACEHOLDER STATE: guaranteed vertical center */
                <motion.div
                  key="placeholder-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`h-full rounded-xl border border-dashed flex flex-col items-center justify-center gap-10 text-center ${
                  isDark ? "border-white/20" : "border-black/15"
                }`}>
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isDark ? "bg-white/[0.07]" : "bg-black/[0.05]"
                  }`}>
                    <svg className={`w-7 h-7 ${isDark ? "text-white/40" : "text-black/35"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Steps */}
                  <ol className="space-y-5 text-left">
                    {([
                      { label: "Paste your text", done: !!textContent.trim() },
                      { label: "Choose a Google Doc", done: !!documentId },
                    ] as { label: string; done: boolean }[]).map(({ label, done }, i) => (
                      <li key={i} className="flex items-center gap-4">
                        <span className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center flex-shrink-0 font-semibold transition-all ${
                          done
                            ? isDark
                              ? "border-white/25 bg-white/[0.08] text-white/40"
                              : "border-black/20 bg-black/[0.05] text-black/40"
                            : isDark
                              ? "border-white/40 text-white/70"
                              : "border-black/35 text-black/65"
                        }`}>
                          {done ? "✓" : i + 1}
                        </span>
                        <span className={`text-sm font-medium transition-all ${
                          done
                            ? isDark ? "text-white/30 line-through" : "text-black/30 line-through"
                            : isDark ? "text-white/65" : "text-black/65"
                        }`}>{label}</span>
                      </li>
                    ))}
                  </ol>

                  <p className={`text-xs tracking-wide ${isDark ? "text-white/20" : "text-black/20"}`}>
                    Preview appears here once ready
                  </p>
                </motion.div>
              )}
              </AnimatePresence>

            </div>
          </div>
        </div>{/* end main layout grid */}
      </div>
      
      {/* Bottom action bar - Mobile only, not sticky */}
      {(() => {
        const isReady = textContent.trim() && documentId
        const isRunning = jobStatus === "running" || jobStatus === "paused"
        
        return (
          <div
            className={`border-t backdrop-blur-md transition-all lg:hidden ${
              isDark
                ? "border-white/10 bg-black/90"
                : "border-black/10 bg-white/98"
            } ${
              // On mobile, only show prominently when ready or running
              isReady || isRunning
                ? "block"
                : "hidden"
            }`}
          >
            <div className="w-full max-w-full px-4 md:px-6 py-3 md:py-4 flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between md:container md:mx-auto overflow-x-hidden">
              {/* Status text - hidden on mobile when ready, shown on desktop */}
              <div
                className={`text-xs hidden md:block ${
                  isDark ? "text-white/50" : "text-black/50"
                }`}
              >
                {wordCount > 0 && (
                  <>
                    {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
                    {showAdvanced && (
                      <>
                        {" "}· {inlineDuration} · {inlineProfileLabel}
                      </>
                    )}
                    {!documentId && " · Select a document"}
                  </>
                )}
                {wordCount === 0 && !documentId && (
                  <span>Add text and select a document to start</span>
                )}
                {wordCount === 0 && documentId && (
                  <span>Add text to start typing</span>
                )}
              </div>
              {/* PlaybackControls only on mobile - desktop has it above live preview */}
              <div className="md:hidden">
                <PlaybackControls
                  status={jobStatus}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStop={handleStop}
                  disabled={loading || !textContent.trim() || !documentId}
                />
              </div>
            </div>
          </div>
        )
      })()}
      
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
  const { isDark } = useDashboardTheme()

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 flex items-center justify-center ${
          isDark ? "text-white/60" : "text-black/60"
        }`}>
          {icon}
        </div>
        <span className={`text-xs ${
          isDark ? "text-white/60" : "text-black/60"
        }`}>
          {label}
        </span>
      </div>
      <p className={`text-base md:text-lg font-semibold ${
        isDark ? "text-white" : "text-black"
      }`}>
        {value}
      </p>
      {subtext && (
        <p className={`text-xs ${
          isDark ? "text-white/50" : "text-black/50"
        }`}>
          {subtext}
        </p>
      )}
    </div>
  )
}

// Pre-Flight Analysis card component
interface PreFlightAnalysisProps {
  wpm: number
  wordCount: number
  durationMinutes: number
  profile: TypingProfile
  isDark: boolean
}

function PreFlightAnalysis({ wpm, wordCount, durationMinutes, profile, isDark }: PreFlightAnalysisProps) {
  const { score, label, colorClass } = scoreWPM(wpm)
  const humanScore = computeHumanScore(wpm, wordCount, durationMinutes, profile)

  // Recommended time range at 50–70 WPM
  const minRecommendedMin = Math.max(1, Math.ceil(wordCount / 70))
  const maxRecommendedMin = Math.max(1, Math.ceil(wordCount / 50))

  const scoreColor =
    humanScore >= 70
      ? isDark ? "text-green-400" : "text-green-600"
      : humanScore >= 45
      ? isDark ? "text-amber-400" : "text-amber-600"
      : isDark ? "text-red-400" : "text-red-500"

  const scoreBorder =
    humanScore >= 70
      ? isDark ? "border-green-500/20" : "border-green-200"
      : humanScore >= 45
      ? isDark ? "border-amber-500/20" : "border-amber-200"
      : isDark ? "border-red-500/20" : "border-red-200"

  const scoreBg =
    humanScore >= 70
      ? isDark ? "bg-green-500/5" : "bg-green-50/60"
      : humanScore >= 45
      ? isDark ? "bg-amber-500/5" : "bg-amber-50/60"
      : isDark ? "bg-red-500/5" : "bg-red-50/60"

  const wpmBadgeColor =
    colorClass === "green"
      ? isDark ? "text-green-400 bg-green-500/10" : "text-green-700 bg-green-100"
      : colorClass === "amber"
      ? isDark ? "text-amber-400 bg-amber-500/10" : "text-amber-700 bg-amber-100"
      : isDark ? "text-red-400 bg-red-500/10" : "text-red-700 bg-red-100"

  const profileTips: Record<TypingProfile, string> = {
    steady: "Steady rhythm — consistent pacing, great for any assignment.",
    burst: "Burst mode — fast runs with settle pauses, best for shorter texts.",
    fatigue: wordCount > 300
      ? "Fatigue pattern — most human-like for long essays."
      : "Fatigue works best on longer texts (300+ words).",
    micropause: "Micropause — subtle hesitations that mimic careful, thoughtful writing.",
    "typing-test": "Typing test mode — fixed WPM target, less natural variation.",
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${scoreBg} ${scoreBorder}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-white/40" : "text-black/40"}`}>
        Pre-Flight Analysis
      </p>

      {/* Score row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className={`text-3xl font-bold tabular-nums leading-none ${scoreColor}`}>{humanScore}%</span>
          <p className={`text-xs mt-1 mb-2 ${isDark ? "text-white/50" : "text-black/50"}`}>Human-Like Score</p>
          {/* Progress bar */}
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-black/10"}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                humanScore >= 70
                  ? isDark ? "bg-green-400" : "bg-green-500"
                  : humanScore >= 45
                  ? isDark ? "bg-amber-400" : "bg-amber-500"
                  : isDark ? "bg-red-400" : "bg-red-500"
              }`}
              style={{ width: `${humanScore}%` }}
            />
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${wpmBadgeColor}`}>
          {colorClass === "green" ? "✓" : colorClass === "amber" ? "⚠" : "✕"}
          {" "}~{wpm} WPM · {label}
        </span>
      </div>

      {/* Recommendation */}
      <p className={`text-xs ${isDark ? "text-white/60" : "text-black/60"}`}>
        For {wordCount.toLocaleString()} words, we recommend{" "}
        <span className={`font-medium ${isDark ? "text-white/80" : "text-black/80"}`}>
          {minRecommendedMin}–{maxRecommendedMin} min
        </span>{" "}
        for a natural 50–70 WPM pace.
      </p>

      {/* Profile tip */}
      <p className={`text-xs ${isDark ? "text-white/50" : "text-black/50"}`}>
        {profileTips[profile]}
      </p>

      {/* Static callout */}
      <p className={`text-xs pt-2 border-t ${isDark ? "border-white/10 text-white/30" : "border-black/10 text-black/35"}`}>
        AI-detection tools analyze text content, not typing patterns. TypeFlow only affects how your typing appears — not what&apos;s written.
      </p>
    </div>
  )
}
