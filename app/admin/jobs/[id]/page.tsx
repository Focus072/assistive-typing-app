"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, RefreshCw, Clock, User, FileText, Zap } from "lucide-react"
import Link from "next/link"

interface JobEvent {
  id: string
  type: string
  details: string | null
  createdAt: string
}

interface JobDetail {
  id: string
  userId: string
  documentId: string
  totalChars: number
  currentIndex: number
  durationMinutes: number
  typingProfile: string
  testWPM: number | null
  status: string
  createdAt: string
  updatedAt: string
  completedAt: string | null
  errorCode: string | null
  scheduledAt: string | null
  engineState: string | null
  dryRun: boolean
  throttleDelayMs: number
  user: { email: string; name: string | null; planTier: string }
  events: JobEvent[]
}

const EVENT_COLORS: Record<string, string> = {
  batch_success: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-rose-500/20 text-rose-300",
  throttled: "bg-amber-500/20 text-amber-300",
  human_break: "bg-blue-500/20 text-blue-300",
  started: "bg-violet-500/20 text-violet-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  paused: "bg-amber-500/20 text-amber-300",
  resumed: "bg-cyan-500/20 text-cyan-300",
  stopped: "bg-zinc-500/20 text-zinc-300",
  batch_error: "bg-rose-500/20 text-rose-300",
  scheduled: "bg-indigo-500/20 text-indigo-300",
  start_dispatch_failed: "bg-rose-500/20 text-rose-300",
}

export default function JobDetailPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEngineState, setShowEngineState] = useState(false)

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/admin/login")
    if (authStatus === "authenticated") fetchJob()
  }, [authStatus, router, jobId])

  const fetchJob = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/jobs/${jobId}`, { cache: "no-store" })
      if (!res.ok) { setError("Job not found"); return }
      const data = await res.json()
      setJob(data.job)
    } catch {
      setError("Failed to load job")
    } finally {
      setLoading(false)
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-rose-400 text-xl font-semibold">{error ?? "Job not found"}</p>
          <Link href="/admin/jobs" className="text-violet-400 hover:underline mt-2 block">Back to Jobs</Link>
        </div>
      </div>
    )
  }

  const progress = job.totalChars > 0 ? (job.currentIndex / job.totalChars) * 100 : 0

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto pl-14 md:pl-4 pr-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <Link href="/admin/jobs" className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold">Job Detail</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
              job.status === "completed" ? "bg-emerald-500/20 text-emerald-300" :
              job.status === "running" ? "bg-blue-500/20 text-blue-300" :
              job.status === "failed" ? "bg-rose-500/20 text-rose-300" :
              "bg-zinc-500/20 text-zinc-300"
            }`}>{job.status}</span>
            {job.dryRun && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full shrink-0">DRY RUN</span>}
          </div>
          <button onClick={fetchJob} disabled={loading} className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Progress */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4">
          <div className="flex justify-between text-sm text-zinc-400 mb-2">
            <span>{job.currentIndex.toLocaleString()} / {job.totalChars.toLocaleString()} chars</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div className="bg-violet-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </motion.div>

        {/* Metadata */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Metadata</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div><p className="text-zinc-500">Job ID</p><p className="font-mono text-xs break-all">{job.id}</p></div>
            <div><p className="text-zinc-500 flex items-center gap-1"><User className="w-3 h-3" />User</p><p>{job.user.email}</p></div>
            <div><p className="text-zinc-500 flex items-center gap-1"><FileText className="w-3 h-3" />Document</p><p className="font-mono text-xs break-all">{job.documentId}</p></div>
            <div><p className="text-zinc-500 flex items-center gap-1"><Zap className="w-3 h-3" />Profile</p><p>{job.typingProfile}</p></div>
            <div><p className="text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />Duration</p><p>{job.durationMinutes} min</p></div>
            <div><p className="text-zinc-500">Plan Tier</p><p>{job.user.planTier}</p></div>
            {job.testWPM && <div><p className="text-zinc-500">Test WPM</p><p>{job.testWPM}</p></div>}
            {job.errorCode && <div><p className="text-zinc-500">Error Code</p><p className="text-rose-400">{job.errorCode}</p></div>}
            <div><p className="text-zinc-500">Created</p><p className="text-xs">{new Date(job.createdAt).toLocaleString()}</p></div>
            {job.completedAt && <div><p className="text-zinc-500">Completed</p><p className="text-xs">{new Date(job.completedAt).toLocaleString()}</p></div>}
            <div><p className="text-zinc-500">Throttle Delay</p><p>{job.throttleDelayMs}ms</p></div>
          </div>
        </motion.div>

        {/* Engine State */}
        {job.engineState && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <button onClick={() => setShowEngineState(!showEngineState)} className="text-lg font-semibold hover:text-violet-400 transition-colors">
              Engine State {showEngineState ? "▼" : "▶"}
            </button>
            {showEngineState && (
              <pre className="mt-3 text-xs text-zinc-400 bg-zinc-900 p-4 rounded-lg overflow-x-auto max-h-60">
                {(() => { try { return JSON.stringify(JSON.parse(job.engineState!), null, 2) } catch { return job.engineState } })()}
              </pre>
            )}
          </motion.div>
        )}

        {/* Event Timeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Event Timeline ({job.events.length} events)</h2>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {job.events.map((event) => {
              let details: Record<string, unknown> = {}
              try { details = JSON.parse(event.details ?? "{}") } catch { /* ignore */ }
              const colorClass = EVENT_COLORS[event.type] ?? "bg-zinc-500/20 text-zinc-300"

              return (
                <div key={event.id} className="flex items-start gap-3 text-sm hover:bg-white/5 px-2 py-1.5 rounded">
                  <span className="text-xs text-zinc-600 shrink-0 mt-0.5 font-mono">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${colorClass}`}>
                    {event.type}
                  </span>
                  <span className="text-zinc-400 text-xs break-all">
                    {event.type === "batch_success" && `${details.insertedChars ?? 0} chars, ${details.delayMs ?? 0}ms delay, progress: ${details.currentIndex ?? 0}`}
                    {event.type === "failed" && <span className="text-rose-400">{String(details.error ?? details.errorCode ?? "unknown")}</span>}
                    {event.type === "human_break" && `${details.breakMs ?? 0}ms (${String(details.tier ?? "unknown")})`}
                    {event.type === "throttled" && `delay: ${details.delay ?? 0}ms`}
                    {!["batch_success", "failed", "human_break", "throttled"].includes(event.type) && JSON.stringify(details)}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
