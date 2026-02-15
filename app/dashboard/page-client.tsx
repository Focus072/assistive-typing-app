"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
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
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { formatDuration, calculateTimeRemaining } from "@/lib/utils"
import { useDashboardTheme } from "./layout"
import type { TypingProfile, JobStatus, DocumentFormat } from "@/types"
import type { FormatMetadata } from "@/components/FormatMetadataModal"

// WPM calculation based on typing profile
function calculateWPM(totalChars: number, durationMinutes: number, profile: TypingProfile, testWPM?: number): number {
  if (totalChars <= 0 || durationMinutes <= 0) return 0
  
  // For typing-test profile, use the test WPM directly
  if (profile === "typing-test" && testWPM) {
    return testWPM
  }
  
  const baseWPM = (totalChars / 5) / durationMinutes
  
  const profileModifiers: Record<TypingProfile, { min: number; max: number }> = {
    steady: { min: 0.95, max: 1.05 },
    fatigue: { min: 0.6, max: 1.0 },
    burst: { min: 0.8, max: 1.2 },
    micropause: { min: 0.7, max: 0.9 },
    "typing-test": { min: 0.9, max: 1.1 }, // Fallback if no testWPM
  }
  
  const modifier = profileModifiers[profile]
  const avgModifier = (modifier.min + modifier.max) / 2
  
  return Math.round(baseWPM * avgModifier)
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
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
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

function DashboardContent() {
  const router = useRouter()
  const { data: session, status, update: updateSession } = useSession()
  const searchParams = useSearchParams()
  // Extract value immediately to avoid Next.js 16 enumeration issues
  const jobIdParam = searchParams.get("jobId")
  const checkoutParam = searchParams.get("checkout")
  const toast = useToast()
  const { isDark } = useDashboardTheme()
  const [showConfetti, setShowConfetti] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showMetadataModal, setShowMetadataModal] = useState(false)
  const [showCustomFormatModal, setShowCustomFormatModal] = useState(false)

  // Redirect to home page if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Grace period state for webhook processing
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [gracePeriodStart, setGracePeriodStart] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerUpdateRef = useRef<NodeJS.Timeout | null>(null)
  const gracePeriodTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const GRACE_PERIOD_MS = 30 * 1000 // 30 seconds
  const POLLING_INTERVAL_MS = 3 * 1000 // Poll every 3 seconds

  // Update remaining seconds display
  useEffect(() => {
    if (isProcessingPayment && gracePeriodStart) {
      const updateTimer = () => {
        const elapsed = Date.now() - gracePeriodStart
        const remaining = Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsed) / 1000))
        setRemainingSeconds(remaining)
        
        if (remaining > 0) {
          timerUpdateRef.current = setTimeout(updateTimer, 1000)
        }
      }
      
      updateTimer()
      
      return () => {
        if (timerUpdateRef.current) {
          clearTimeout(timerUpdateRef.current)
          timerUpdateRef.current = null
        }
      }
    } else {
      setRemainingSeconds(30)
    }
  }, [isProcessingPayment, gracePeriodStart])

  // Handle checkout success with grace period and polling
  useEffect(() => {
    if (checkoutParam === "success" && status === "authenticated") {
      const subscriptionStatus = (session?.user as any)?.subscriptionStatus
      
      // If subscription is already active, proceed normally
      if (subscriptionStatus === 'active') {
        updateSession().then(() => {
          toast.addToast("Payment Successful! Your plan has been upgraded. Enjoy your new features!", "success")
          setShowConfetti(true)
          router.replace("/dashboard", { scroll: false })
        })
        return
      }
      
      // Start grace period
      setIsProcessingPayment(true)
      setGracePeriodStart(Date.now())
      
      // Initial session refresh
      updateSession().catch((error) => {
        console.error("Failed to refresh session:", error)
      })
      
      // Start polling for subscription status
      pollingIntervalRef.current = setInterval(async () => {
        try {
          // Trigger session refresh
          await updateSession()
          // Check session state (will be updated by the hook)
          // We'll check it in the next effect that watches session changes
        } catch (error) {
          console.error("Failed to refresh session during polling:", error)
        }
      }, POLLING_INTERVAL_MS)
      
      // Cleanup: Stop polling after grace period expires
      gracePeriodTimeoutRef.current = setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        
        // Check one final time
        updateSession().then(() => {
          // Give a moment for session to update, then check
          setTimeout(() => {
            const finalStatus = (session?.user as any)?.subscriptionStatus
            if (finalStatus === 'active') {
              setIsProcessingPayment(false)
              setGracePeriodStart(null)
              toast.addToast("Payment Successful! Your plan has been upgraded. Enjoy your new features!", "success")
              setShowConfetti(true)
              router.replace("/dashboard", { scroll: false })
            } else {
              // Grace period expired, redirect to pricing
              setIsProcessingPayment(false)
              setGracePeriodStart(null)
              toast.addToast("Payment is being processed. Please wait a moment and refresh the page.", "info")
              router.push("/#pricing")
            }
          }, 500)
        }).catch((error) => {
          console.error("Failed to check final status:", error)
          setIsProcessingPayment(false)
          setGracePeriodStart(null)
          router.push("/#pricing")
        })
      }, GRACE_PERIOD_MS)
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        if (timerUpdateRef.current) {
          clearTimeout(timerUpdateRef.current)
          timerUpdateRef.current = null
        }
        if (gracePeriodTimeoutRef.current) {
          clearTimeout(gracePeriodTimeoutRef.current)
          gracePeriodTimeoutRef.current = null
        }
      }
    }
  }, [checkoutParam, status, updateSession, router, toast])

  // Watch for session updates during grace period
  useEffect(() => {
    if (isProcessingPayment && session) {
      const subscriptionStatus = (session.user as any)?.subscriptionStatus
      if (subscriptionStatus === 'active') {
        // Success! Stop polling and show success message
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        setIsProcessingPayment(false)
        setGracePeriodStart(null)
        toast.addToast("Payment Successful! Your plan has been upgraded. Enjoy your new features!", "success")
        setShowConfetti(true)
        router.replace("/dashboard", { scroll: false })
      }
    }
  }, [session, isProcessingPayment, router, toast])

  const [textContent, setTextContent] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [typingProfile, setTypingProfile] = useState<TypingProfile>("steady")
  const [testWPM, setTestWPM] = useState<number | undefined>(undefined)
  const [documentFormat, setDocumentFormat] = useState<DocumentFormat>("mla")
  const [formatMetadata, setFormatMetadata] = useState<FormatMetadata | undefined>(undefined)
  const [customFormatConfig, setCustomFormatConfig] = useState<CustomFormatConfig | undefined>(undefined)
  const [documentId, setDocumentId] = useState("")
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loadingDocumentUrl, setLoadingDocumentUrl] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)

  // Show text input if text exists
  useEffect(() => {
    if (textContent && !showTextInput) {
      setShowTextInput(true)
    }
  }, [textContent, showTextInput])

  // Fetch document URL when documentId changes
  useEffect(() => {
    if (!documentId) {
      setDocumentUrl(null)
      setIframeError(false)
      return
    }

    let cancelled = false
    setLoadingDocumentUrl(true)
    setIframeError(false) // Reset iframe error when document changes

    const fetchDocumentUrl = async () => {
      try {
        const response = await fetch(`/api/google-docs/${documentId}/url`)
        if (!response.ok) {
          throw new Error("Failed to fetch document URL")
        }
        const data = await response.json()
        if (!cancelled) {
          setDocumentUrl(data.url)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching document URL:", error)
          // Fallback to constructed URL if API fails
          setDocumentUrl(`https://docs.google.com/document/d/${documentId}/edit`)
        }
      } finally {
        if (!cancelled) {
          setLoadingDocumentUrl(false)
        }
      }
    }

    void fetchDocumentUrl()

    return () => {
      cancelled = true
    }
  }, [documentId])


  // Job state
  const [currentJobId, setCurrentJobId] = useState<string | null>(jobIdParam)
  const currentJobIdRef = useRef<string | null>(jobIdParam)
  const progressStreamRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [jobDurationMinutes, setJobDurationMinutes] = useState(30)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [jobTypingProfile, setJobTypingProfile] = useState<TypingProfile>("steady")
  const [jobTestWPM, setJobTestWPM] = useState<number | undefined>(undefined)
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
        setJobTestWPM(job.testWPM ? Number(job.testWPM) : undefined)
        setJobStartTime(new Date(job.createdAt))
      }
    } catch (error) {
      toast.addToast("Failed to load job", "error")
    }
  }, [toast])

  const startProgressStream = useCallback((id: string) => {
    // Close any existing stream first
    if (progressStreamRef.current) {
      progressStreamRef.current.close()
      progressStreamRef.current = null
    }

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    const eventSource = new EventSource(`/api/progress/stream?jobId=${id}`)
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

        // Reset reconnect attempts on successful message
        reconnectAttemptsRef.current = 0

        // Close stream if job is finished
        if (["completed", "stopped", "failed", "expired"].includes(data.status)) {
          eventSource.close()
          progressStreamRef.current = null
        }
      } catch (error) {
        // Silently handle parse errors - invalid data will be ignored
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      progressStreamRef.current = null

      // Only reconnect if job is still active and we haven't exceeded max attempts
      if (currentJobIdRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++
        const delay = reconnectDelay * Math.min(reconnectAttemptsRef.current, 5) // Exponential backoff, max 10s
        
        reconnectTimeoutRef.current = setTimeout(() => {
          // Double-check job is still active before reconnecting
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

  // Load job from URL param
  useEffect(() => {
    if (jobIdParam) {
      loadJob(jobIdParam)
    }
  }, [jobIdParam, loadJob])

  // Manage EventSource lifecycle explicitly
  useEffect(() => {
    const jobId = currentJobId

    if (!jobId) {
      // Clean up if no job is active
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

    // Start stream for active job
    startProgressStream(jobId)

    // Cleanup function: close stream and clear timeouts on unmount or job change
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
        let data: any = {}
        let errorMsg = "Failed to create document"
        
        try {
          const responseText = await response.text()
          if (responseText) {
            data = JSON.parse(responseText)
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
    } catch (error: any) {
      // Re-throw if it's already our error
      if (error.message && error.message !== "Failed to create document") {
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
      const response = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textContent,
          durationMinutes,
          typingProfile,
          documentId,
          testWPM: typingProfile === "typing-test" ? testWPM : undefined,
        }),
      })

      if (!response.ok) {
        let data: any = {}
        let errorMsg = "Failed to start job"
        
        try {
          const responseText = await response.text()
          if (responseText) {
            data = JSON.parse(responseText)
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
      setJobStatus("running")
      setTotalChars(textContent.length)
      setJobDurationMinutes(durationMinutes)
      setJobTypingProfile(typingProfile)
      setJobTestWPM(testWPM)
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
    ? calculateCurrentWPM(currentIndex, totalChars, elapsedMinutes, jobTypingProfile, jobTestWPM)
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
  }


  return (
    <>
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      
      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-8 max-w-md w-full mx-4 ${
            isDark 
              ? "bg-black border-white/20" 
              : "bg-white border-black/10"
          }`}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-center space-y-2">
                <h3 className={`text-lg font-semibold ${
                  isDark ? "text-white" : "text-black"
                }`}>
                  Finalizing your access...
                </h3>
                <p className={`text-sm ${
                  isDark ? "text-white/70" : "text-black/70"
                }`}>
                  Your payment was successful! We're processing your subscription.
                  {remainingSeconds > 0 && (
                    <span className="block mt-2 text-xs">
                      This may take up to {remainingSeconds} seconds...
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
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
      
          <div className="space-y-6 md:space-y-8 pb-6">

          {currentJobId && (
            <div className="flex flex-wrap items-center gap-3">
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
            </div>
          )}

        {/* Error Alert - Mobile Optimized */}
        {error && (
          <div className={`rounded-lg border p-4 flex items-start gap-3 ${
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
          </div>
        )}

        {/* Stats Cards - Simplified */}
        {currentJobId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
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
          </div>
        )}

        {/* Progress Bar - Simplified */}
        {currentJobId && (
          <div
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
          </div>
        )}

        {/* Main Layout - Simplified Flow */}
        <div className="space-y-6 md:space-y-8">
          {/* Text Input Section - Collapsible */}
          <div className="space-y-2 md:space-y-3">
            {!showTextInput && !textContent && (
              <button
                type="button"
                onClick={() => setShowTextInput(true)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    : "bg-black/5 border-black/10 text-black hover:bg-black/10"
                }`}
              >
                <span className="text-sm font-medium">Add text to type</span>
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
            
            {(showTextInput || textContent) && (
              <>
                {!textContent && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowTextInput(false)}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        isDark
                          ? "text-white/50 hover:text-white/70"
                          : "text-black/50 hover:text-black/70"
                      }`}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
                
                <TextInput
                  value={textContent}
                  onChange={setTextContent}
                  maxChars={50000}
                />

                <div
                  className={`flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isDark ? "text-white/50" : "text-black/50"
                  }`}
                >
                  <span>
                    {wordCount.toLocaleString()}{" "}
                    {wordCount === 1 ? "word" : "words"}
                    {showAdvanced && wordCount > 0 && (
                      <>
                        {" "}
                        · {inlineDuration} · {inlineProfileLabel}
                      </>
                    )}
                  </span>
                  {textContent && (
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
                        isDark
                          ? "text-white/60 hover:text-white/80"
                          : "text-black/60 hover:text-black/80"
                      }`}
                    >
                      Copy
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Document Selection - Primary (more prominent on mobile) */}
          <div className={`pt-6 md:pt-6 border-t ${
            isDark ? "border-white/10" : "border-black/10"
          }`}>
            <DocsSelector
              value={documentId}
              onChange={setDocumentId}
              onCreateNew={handleCreateDocument}
            />
          </div>

          {/* Tier 1: Core Options - Always Visible */}
          <div className={`pt-6 border-t ${
            isDark ? "border-white/10" : "border-black/10"
          } space-y-4`}>
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
            />
          </div>

          {/* Secondary: Advanced Options - Collapsed by default */}
          <div className={`pt-6 border-t ${
            isDark ? "border-white/5" : "border-black/5"
          }`}>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`flex items-center gap-2 text-xs transition-colors w-full ${
                isDark
                  ? "text-white/50 hover:text-white/70"
                  : "text-black/50 hover:text-black/70"
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${
                  showAdvanced ? "rotate-90" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span>
                {showAdvanced
                  ? "Hide advanced options"
                  : "Advanced options"}
              </span>
            </button>

            {showAdvanced && (
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
            )}
          </div>

          {documentId && (
            <div className={`space-y-4 hidden md:block pt-6 border-t ${
              isDark ? "border-white/10" : "border-black/10"
            }`}>
              {/* Start Typing Controls - Above Live Preview */}
              <div className="space-y-3">
                {/* Summary line */}
                {textContent.trim() && documentId && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                    isDark 
                      ? "bg-white/5 border-white/10 text-white/70" 
                      : "bg-black/5 border-black/10 text-black/70"
                  }`}>
                    <span className="font-medium">
                      {formatDuration(durationMinutes)}
                    </span>
                    <span>·</span>
                    <span className="capitalize">{typingProfile === "typing-test" && testWPM ? `${testWPM} WPM` : typingProfile}</span>
                    {documentFormat !== "none" && (
                      <>
                        <span>·</span>
                        <span className="uppercase">{documentFormat === "mla" ? "MLA" : documentFormat === "custom" ? "Custom" : ""}</span>
                      </>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-base font-medium mb-1 ${
                      isDark ? "text-white" : "text-black"
                    }`}>
                      Live preview
                    </h3>
                    <p className={`text-xs ${
                      isDark ? "text-white/50" : "text-black/50"
                    }`}>
                      {textContent.trim() && documentId 
                        ? "Ready to start typing into your document"
                        : "Select a document and add text to begin"}
                    </p>
                  </div>
                <div className="flex items-center gap-3">
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
                    className={`text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
                      isDark
                        ? "text-white/70 hover:text-white border-white/20 hover:bg-white/10"
                        : "text-black/70 hover:text-black border-black/20 hover:bg-black/5"
                    } ${loadingDocumentUrl ? "opacity-50 cursor-wait" : ""}`}
                    onClick={(e) => {
                      if (loadingDocumentUrl) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <span>Open in Google Docs</span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
                </div>
              </div>
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
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          <span className="text-sm font-medium">Open in Google Docs</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {jobStatus === "running" && (
                  <div className={`absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm ${
                    isDark
                      ? "bg-black/80 border-white/10"
                      : "bg-white/95 border-black/10"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isDark ? "bg-green-400" : "bg-green-600"
                    }`} />
                    <span className={`text-xs font-medium ${
                      isDark ? "text-white" : "text-black"
                    }`}>
                      {displayWPM} WPM
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Mobile: Simple link to open document */}
          {documentId && (
            <div className="md:hidden">
              <a
                href={documentUrl || `https://docs.google.com/document/d/${documentId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                    : "bg-black/5 border-black/20 text-black hover:bg-black/10"
                } ${loadingDocumentUrl ? "opacity-50 cursor-wait" : ""}`}
                onClick={(e) => {
                  if (loadingDocumentUrl) {
                    e.preventDefault()
                  }
                }}
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
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span className="text-sm font-medium">Open in Google Docs</span>
              </a>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom action bar - Mobile only, not sticky */}
      {(() => {
        const isReady = textContent.trim() && documentId
        const isRunning = jobStatus === "running" || jobStatus === "paused"
        
        return (
          <div
            className={`border-t backdrop-blur-md transition-all ${
              isDark
                ? "border-white/10 bg-black/90"
                : "border-black/10 bg-white/98"
            } ${
              // On mobile, only show prominently when ready or running
              isReady || isRunning
                ? "md:block"
                : "hidden md:block"
            }`}
          >
            <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
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
      
      {/* Mobile: Floating action button when ready but not running */}
      {(() => {
        const isReady = textContent.trim() && documentId && jobStatus !== "running" && jobStatus !== "paused" && jobStatus !== "completed"
        
        return isReady ? (
          <div className="fixed bottom-20 right-4 z-20 md:hidden">
            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation ${
                isDark
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-black text-white hover:bg-gray-900"
              }`}
              aria-label="Start typing"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ) : null
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
