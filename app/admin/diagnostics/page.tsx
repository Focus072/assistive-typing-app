"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Activity, RefreshCw, Database, Server, Cpu } from "lucide-react"
import Link from "next/link"
import { MobileMenuButton } from "../_components/admin-sidebar"

interface DiagnosticsData {
  database: {
    status: string
    latencyMs: number
    stats: { users: number; jobs: number; events: number }
  }
  inngest: {
    eventKeySet: boolean
    signingKeySet: boolean
    baseUrl: string
  }
  environment: {
    nodeVersion: string
    platform: string
    uptime: number
    env: string
    vercelRegion: string
  }
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${ok ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"}`} />
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export default function DiagnosticsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login")
    if (status === "authenticated") fetchDiagnostics()
  }, [status, router])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchDiagnostics()
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const fetchDiagnostics = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/diagnostics", { cache: "no-store" })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
      setCountdown(30)
    }
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
            <Activity className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold">System Diagnostics</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Refresh in {countdown}s</span>
            <button onClick={() => { fetchDiagnostics(); setCountdown(30) }} className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Database */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold">Database</h2>
              {data && <StatusDot ok={data.database.status === "connected"} />}
            </div>
            {data ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className={data.database.status === "connected" ? "text-emerald-400" : "text-rose-400"}>{data.database.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Latency</span>
                  <span>{data.database.latencyMs}ms</span>
                </div>
                <div className="border-t border-white/10 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Users</span>
                    <span className="text-zinc-300">{data.database.stats.users.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Jobs</span>
                    <span className="text-zinc-300">{data.database.stats.jobs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Events</span>
                    <span className="text-zinc-300">{data.database.stats.events.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Loading...</p>
            )}
          </motion.div>

          {/* Inngest */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Inngest</h2>
              {data && <StatusDot ok={data.inngest.eventKeySet} />}
            </div>
            {data ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Event Key</span>
                  <span className={data.inngest.eventKeySet ? "text-emerald-400" : "text-rose-400"}>
                    {data.inngest.eventKeySet ? "Set" : "Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Signing Key</span>
                  <span className={data.inngest.signingKeySet ? "text-emerald-400" : "text-rose-400"}>
                    {data.inngest.signingKeySet ? "Set" : "Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Base URL</span>
                  <span className="text-zinc-300 text-xs truncate max-w-[120px]">{data.inngest.baseUrl}</span>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Loading...</p>
            )}
          </motion.div>

          {/* Environment */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold">Environment</h2>
            </div>
            {data ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Node.js</span>
                  <span>{data.environment.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Environment</span>
                  <span className={data.environment.env === "production" ? "text-emerald-400" : "text-amber-400"}>{data.environment.env}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Platform</span>
                  <span>{data.environment.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Uptime</span>
                  <span>{formatUptime(data.environment.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Region</span>
                  <span>{data.environment.vercelRegion}</span>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Loading...</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
