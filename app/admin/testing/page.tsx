"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Play, FlaskConical, Loader2 } from "lucide-react"
import Link from "next/link"
import { MobileMenuButton } from "../_components/admin-sidebar"

interface BatchEvent {
  id: string
  type: string
  details: string | null
  createdAt: string
}

interface TestJob {
  id: string
  status: string
  currentIndex: number
  totalChars: number
  typingProfile: string
  durationMinutes: number
  createdAt: string
  completedAt: string | null
}

interface TestRun {
  jobId: string
  job: TestJob | null
  events: BatchEvent[]
  profile: string
}

const PROFILES = ["steady", "fatigue", "burst", "micropause", "typing-test"]
const DEFAULT_TEXT = "The quick brown fox jumps over the lazy dog. This is a test of the typing engine to verify batch timing, typo simulation, and delay patterns across different profiles."

export default function TestRunnerPage() {
  const { status } = useSession()
  const router = useRouter()

  const [textContent, setTextContent] = useState(DEFAULT_TEXT)
  const [durationMinutes, setDurationMinutes] = useState(3)
  const [typingProfile, setTypingProfile] = useState("steady")
  const [testWPM, setTestWPM] = useState(40)
  const [compareMode, setCompareMode] = useState(false)
  const [compareProfile, setCompareProfile] = useState("burst")
  const [runs, setRuns] = useState<TestRun[]>([])
  const [starting, setStarting] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login")
  }, [status, router])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const pollEvents = useCallback((activeRuns: TestRun[]) => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      let allDone = true
      const updated = await Promise.all(
        activeRuns.map(async (run) => {
          try {
            const res = await fetch(`/api/admin/test-job/${run.jobId}/events`, { cache: "no-store" })
            if (!res.ok) return run
            const data = await res.json()
            if (!["completed", "stopped", "failed"].includes(data.job.status)) allDone = false
            return { ...run, job: data.job, events: data.events }
          } catch {
            return run
          }
        })
      )
      setRuns(updated)
      if (allDone && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 2000)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [runs])

  const startTest = async () => {
    setStarting(true)
    const profilesToRun = compareMode ? [typingProfile, compareProfile] : [typingProfile]
    const newRuns: TestRun[] = []

    for (const profile of profilesToRun) {
      try {
        const res = await fetch("/api/admin/test-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            textContent,
            durationMinutes,
            typingProfile: profile,
            testWPM: profile === "typing-test" ? testWPM : undefined,
          }),
        })
        if (res.ok) {
          const { jobId } = await res.json()
          newRuns.push({ jobId, job: null, events: [], profile })
        }
      } catch {
        // ignore
      }
    }

    setRuns(newRuns)
    setStarting(false)
    if (newRuns.length > 0) pollEvents(newRuns)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <Link href="/admin" className="hidden md:flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold">Engine Test Runner</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Config Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Text Content</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                placeholder="Paste text to type..."
              />
              <p className="text-xs text-zinc-500 mt-1">{textContent.length} characters</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Profile</label>
                <select
                  value={typingProfile}
                  onChange={(e) => setTypingProfile(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={360}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              {typingProfile === "typing-test" && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Test WPM</label>
                  <input
                    type="number"
                    value={testWPM}
                    onChange={(e) => setTestWPM(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={300}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compareMode}
                    onChange={(e) => setCompareMode(e.target.checked)}
                    className="rounded border-white/10"
                  />
                  Compare profiles
                </label>
              </div>
            </div>

            {compareMode && (
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Compare with</label>
                <select
                  value={compareProfile}
                  onChange={(e) => setCompareProfile(e.target.value)}
                  className="w-full sm:w-48 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {PROFILES.filter(p => p !== typingProfile).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            <button
              onClick={startTest}
              disabled={starting || !textContent.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-400 rounded-lg text-sm font-medium transition-colors"
            >
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {starting ? "Starting..." : "Run Dry Test"}
            </button>
          </div>
        </motion.div>

        {/* Results */}
        {runs.length > 0 && (
          <div className={`grid gap-6 ${compareMode && runs.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {runs.map((run, idx) => (
              <motion.div
                key={run.jobId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    <span className="text-violet-400">{run.profile}</span>
                    {run.job && (
                      <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        run.job.status === "completed" ? "bg-emerald-500/20 text-emerald-300" :
                        run.job.status === "running" ? "bg-blue-500/20 text-blue-300" :
                        run.job.status === "failed" ? "bg-rose-500/20 text-rose-300" :
                        "bg-zinc-500/20 text-zinc-300"
                      }`}>
                        {run.job.status}
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-zinc-500">{run.jobId.slice(0, 8)}...</span>
                </div>

                {/* Progress bar */}
                {run.job && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>{run.job.currentIndex} / {run.job.totalChars} chars</span>
                      <span>{run.job.totalChars > 0 ? Math.round((run.job.currentIndex / run.job.totalChars) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${run.job.totalChars > 0 ? (run.job.currentIndex / run.job.totalChars) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Batch log */}
                <div className="max-h-80 overflow-y-auto space-y-1 font-mono text-xs">
                  {run.events
                    .filter(e => e.type === "batch_success")
                    .map((event) => {
                      let details: Record<string, unknown> = {}
                      try { details = JSON.parse(event.details ?? "{}") } catch { /* ignore */ }
                      const hasMistake = (details.mistakePlan as Record<string, unknown>)?.hasMistake
                      return (
                        <div key={event.id} className="flex gap-2 text-zinc-400 hover:bg-white/5 px-2 py-1 rounded">
                          <span className="text-zinc-600 shrink-0">{new Date(event.createdAt).toLocaleTimeString()}</span>
                          <span className="text-emerald-400 shrink-0">[{String(details.batchSize ?? "?")}ch]</span>
                          <span className="text-white truncate">&quot;{String(details.batchText ?? "").replace(/\n/g, "\\n")}&quot;</span>
                          <span className="text-cyan-400 shrink-0">{String(details.delayMs ?? 0)}ms</span>
                          {Boolean(hasMistake) && <span className="text-rose-400 shrink-0">TYPO</span>}
                        </div>
                      )
                    })}
                  {run.events.filter(e => e.type === "human_break").map((event) => {
                    let details: Record<string, unknown> = {}
                    try { details = JSON.parse(event.details ?? "{}") } catch { /* ignore */ }
                    return (
                      <div key={event.id} className="flex gap-2 text-amber-400 px-2 py-1 rounded">
                        <span className="text-zinc-600 shrink-0">{new Date(event.createdAt).toLocaleTimeString()}</span>
                        <span>BREAK {String(details.breakMs ?? 0)}ms ({String(details.tier ?? "unknown")})</span>
                      </div>
                    )
                  })}
                  <div ref={logEndRef} />
                </div>

                {/* Summary stats */}
                {run.job?.status === "completed" && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-zinc-500">Batches</p>
                      <p className="text-sm font-semibold">{run.events.filter(e => e.type === "batch_success").length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Typos</p>
                      <p className="text-sm font-semibold text-rose-400">
                        {run.events.filter(e => {
                          try {
                            const d = JSON.parse(e.details ?? "{}")
                            return d.mistakePlan?.hasMistake
                          } catch { return false }
                        }).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Breaks</p>
                      <p className="text-sm font-semibold text-amber-400">
                        {run.events.filter(e => e.type === "human_break").length}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
