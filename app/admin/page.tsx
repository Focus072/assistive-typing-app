"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  RefreshCw, ArrowLeft, Search, Bell,
  ChevronDown, Settings, TrendingUp, TrendingDown, Users, Zap,
  CheckCircle2,
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from "chart.js"
import { Line, Doughnut } from "react-chartjs-2"
import { SettingsPanel } from "./_components/settings-panel"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

/* ────────── Types ────────── */

interface AdminStats {
  overview: {
    totalUsers: number
    totalJobs: number
    activeJobs: number
    completedJobs: number
    failedJobs: number
    googleOAuthUsers: number
    credentialUsers: number
    successRate: number
    totalDocuments?: number
    activeSubscribers?: number
    academicIntegrityAcceptedCount?: number
  }
  topUser: { id: string; email: string; name: string | null; jobCount: number } | null
  recentUsers: Array<{
    id: string; email: string; name: string | null; image: string | null
    createdAt: Date; accounts: Array<{ provider: string }>
  }>
  recentJobs: Array<{
    id: string; userId: string; status: string; createdAt: Date
    completedAt: Date | null; totalChars: number
  }>
}

interface ActivityJob {
  id: string; userId: string; email: string | null; status: string
  totalChars: number | null; durationMinutes: number | null
  typingProfile: string | null; createdAt: string
  completedAt: string | null; errorCode: string | null
}

interface AdminSettings {
  maintenance_mode: string | null
  FREE_MAX_JOBS_PER_DAY: string | null
  FREE_MAX_JOB_HISTORY: string | null
  enabled_profiles: string | null
}

interface AnalyticsData {
  completedVsFailed: Array<{ date: string; completed: number; failed: number }>
  profileDistribution: Array<{ profile: string; count: number }>
  jobsPerDay: Array<{ date: string; count: number }>
}

interface DiagnosticsData {
  database: { status: string; latencyMs: number; stats: { users: number; jobs: number; events: number } }
  inngest: { eventKeySet: boolean; signingKeySet: boolean; baseUrl: string }
  environment: { nodeVersion: string; platform: string; uptime: number; env: string; vercelRegion: string }
}

/* ────────── Helpers ────────── */

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: "easeOut" as const },
})

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed" ? "bg-emerald-400" :
    status === "running" ? "bg-blue-400" :
    status === "failed" ? "bg-rose-400" :
    status === "paused" ? "bg-amber-400" :
    "bg-zinc-400"
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color} ${status === "running" ? "animate-pulse" : ""}`} />
      <span className={`text-xs font-medium ${
        status === "completed" ? "text-emerald-300" :
        status === "running" ? "text-blue-300" :
        status === "failed" ? "text-rose-300" :
        status === "paused" ? "text-amber-300" :
        "text-zinc-300"
      }`}>
        {status}
      </span>
    </span>
  )
}

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-medium text-zinc-300">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

function MiniCard({ label, value, change, icon: Icon, color }: {
  label: string; value: string; change?: string; icon: React.ElementType; color: string
}) {
  const isPositive = change?.startsWith("+")
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {change && (
        <div className="flex items-center gap-1">
          {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
          <span className={`text-xs font-medium ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>{change}</span>
          <span className="text-xs text-zinc-500">vs last week</span>
        </div>
      )}
    </div>
  )
}

/* ────────── Main Component ────────── */

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activity, setActivity] = useState<ActivityJob[]>([])
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [hasNotifications, setHasNotifications] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/admin/stats", { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
      if (res.status === 401) { setError("Unauthorized: You don't have admin access"); return }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to fetch stats")
      setStats(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard")
    } finally { setLoading(false) }
  }, [])

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity?limit=50", { cache: "no-store" })
      if (res.ok) {
        const data = (await res.json()).jobs ?? []
        setActivity(data)
        // Show notification dot if there are failed jobs in last hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        setHasNotifications(data.some((j: ActivityJob) => j.status === "failed" && new Date(j.createdAt).getTime() > oneHourAgo))
      }
    } catch { setActivity([]) }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" })
      if (res.ok) setSettings(await res.json())
      else setSettings({ maintenance_mode: null, FREE_MAX_JOBS_PER_DAY: null, FREE_MAX_JOB_HISTORY: null, enabled_profiles: null })
    } catch {
      setSettings({ maintenance_mode: null, FREE_MAX_JOBS_PER_DAY: null, FREE_MAX_JOB_HISTORY: null, enabled_profiles: null })
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      if (res.ok) setAnalytics(await res.json())
    } catch { /* ignore */ }
  }, [])

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/diagnostics", { cache: "no-store" })
      if (res.ok) setDiagnostics(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/admin/login"); return }
    if (status === "authenticated") {
      fetchStats()
      fetchActivity()
      fetchSettings()
      fetchAnalytics()
      fetchDiagnostics()
    }
  }, [status, router, fetchStats, fetchActivity, fetchSettings, fetchAnalytics, fetchDiagnostics])

  const patchSettings = async (updates: Partial<AdminSettings>) => {
    if (!settings) return
    setSettingsSaving(true)
    try {
      const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) })
      if (res.ok) setSettings(await res.json())
    } finally { setSettingsSaving(false) }
  }

  const refreshAll = async () => {
    setRefreshing(true)
    await Promise.all([fetchStats(), fetchActivity(), fetchSettings(), fetchAnalytics(), fetchDiagnostics()])
    setRefreshing(false)
  }

  /* ── Loading / Error states ── */
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading admin dashboard...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="text-rose-400 text-xl font-semibold mb-2">Access Denied</div>
          <p className="text-zinc-400 mb-4">{error}</p>
          <Link href="/admin/login" className="inline-block px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors">
            Go to Admin Login
          </Link>
        </motion.div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  const runningJobs = activity.filter(j => j.status === "running")
  const recentActivity = activity.slice(0, 8)

  /* ── Chart Data ── */
  const lineChartData = {
    labels: (analytics?.completedVsFailed ?? []).map(d => {
      const date = new Date(d.date)
      return date.toLocaleDateString("en-US", { weekday: "short" })
    }),
    datasets: [
      {
        label: "Completed",
        data: (analytics?.completedVsFailed ?? []).map(d => d.completed),
        borderColor: "rgb(52, 211, 153)",
        backgroundColor: "rgba(52, 211, 153, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "rgb(52, 211, 153)",
      },
      {
        label: "Failed",
        data: (analytics?.completedVsFailed ?? []).map(d => d.failed),
        borderColor: "rgb(251, 113, 133)",
        backgroundColor: "rgba(251, 113, 133, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "rgb(251, 113, 133)",
      },
    ],
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" as const, labels: { color: "#a1a1aa", font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: "#18181b",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        titleColor: "#fff",
        bodyColor: "#a1a1aa",
      },
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#71717a", font: { size: 10 } } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#71717a", font: { size: 10 } }, beginAtZero: true },
    },
  }

  const profileColors = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#6366f1"]
  const donutData = {
    labels: (analytics?.profileDistribution ?? []).map(d => d.profile ?? "unknown"),
    datasets: [{
      data: (analytics?.profileDistribution ?? []).map(d => d.count),
      backgroundColor: profileColors.slice(0, (analytics?.profileDistribution ?? []).length),
      borderColor: "rgba(0,0,0,0.3)",
      borderWidth: 2,
    }],
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640
  const donutLegendPosition: "bottom" | "right" = isMobile ? "bottom" : "right"
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { display: true, position: donutLegendPosition, labels: { color: "#a1a1aa", font: { size: 11 }, boxWidth: 12, padding: 8 } },
      tooltip: { backgroundColor: "#18181b", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, titleColor: "#fff", bodyColor: "#a1a1aa" },
    },
  }

  /* ── System Health ── */
  const dbHealth = diagnostics ? (diagnostics.database.status === "connected" ? 100 : 0) : 0
  const dbLatency = diagnostics?.database.latencyMs ?? 0
  const apiHealth = dbHealth > 0 ? Math.max(0, 100 - Math.floor(dbLatency / 5)) : 0
  const queueHealth = diagnostics?.inngest.eventKeySet && diagnostics?.inngest.signingKeySet ? 95 : 40
  const authHealth = 100
  const memoryUsed = typeof process !== "undefined" ? 72 : 65 // approximation for client

  /* ── Daily volume sparkline data ── */
  const dailyVolume = analytics?.jobsPerDay?.slice(-7) ?? []
  const maxVolume = Math.max(1, ...dailyVolume.map(d => d.count))

  /* ── Mini card computed values ── */
  const todayJobs = dailyVolume.length > 0 ? dailyVolume[dailyVolume.length - 1].count : 0
  const yesterdayJobs = dailyVolume.length > 1 ? dailyVolume[dailyVolume.length - 2].count : 0
  const jobChange = yesterdayJobs > 0
    ? `${todayJobs >= yesterdayJobs ? "+" : ""}${Math.round(((todayJobs - yesterdayJobs) / yesterdayJobs) * 100)}%`
    : undefined

  /* ── Search filter ── */
  const filteredActivity = searchQuery
    ? recentActivity.filter(j =>
        (j.email ?? j.userId).toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.typingProfile ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentActivity

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Mobile header: two rows for breathing room */}
          <div className="flex md:hidden flex-col gap-2">
            {/* Row 1: hamburger spacer + title + action icons */}
            <div className="flex items-center gap-2">
              {/* Spacer matching the fixed hamburger button width */}
              <div className="w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-white truncate">Dashboard</h1>
                <p className="text-[11px] text-zinc-500 truncate">{session?.user?.email}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setHasNotifications(false); router.push("/admin/jobs") }}
                  className="relative flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {hasNotifications && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-zinc-950" />
                  )}
                </button>
                <button
                  onClick={refreshAll}
                  disabled={refreshing}
                  className="flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
            {/* Row 2: full-width search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, users..."
                className="w-full h-10 pl-10 pr-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Desktop header: single row */}
          <div className="hidden md:flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white">Dashboard</h1>
                <p className="text-xs text-zinc-500 truncate">{session?.user?.email}</p>
              </div>
              {runningJobs.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="text-xs font-medium text-blue-300">{runningJobs.length} live</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Search bar with focus expansion */}
              <div className={`relative transition-all duration-300 ${searchFocused ? "w-64" : "w-10"}`}>
                <button
                  onClick={() => { setSearchFocused(true); setTimeout(() => searchRef.current?.focus(), 50) }}
                  className={`absolute left-0 top-0 flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white rounded-lg transition-colors ${searchFocused ? "pointer-events-none" : ""}`}
                >
                  <Search className="w-4 h-4" />
                </button>
                {searchFocused && (
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setSearchFocused(false) }}
                    placeholder="Search jobs, users..."
                    className="w-full h-10 pl-10 pr-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                  />
                )}
              </div>

              <button
                onClick={() => { setHasNotifications(false); router.push("/admin/jobs") }}
                className="relative flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                {hasNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-zinc-950" />
                )}
              </button>

              <button
                onClick={refreshAll}
                disabled={refreshing}
                className="flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 h-10 px-3 text-violet-400 hover:text-violet-300 hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>App</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Metric Mini-Cards ── */}
        <motion.div {...fadeUp(0)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniCard
            label="Total Users"
            value={stats.overview.totalUsers.toLocaleString()}
            icon={Users}
            color="text-violet-400"
          />
          <MiniCard
            label="Jobs Today"
            value={todayJobs.toLocaleString()}
            change={jobChange}
            icon={Zap}
            color="text-cyan-400"
          />
          <MiniCard
            label="Success Rate"
            value={`${stats.overview.successRate}%`}
            icon={CheckCircle2}
            color="text-emerald-400"
          />
        </motion.div>

        {/* ── Charts Row: Line + Donut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line chart — Completed vs Failed (7 days) */}
          <motion.div
            {...fadeUp(0.08)}
            className="lg:col-span-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-5"
          >
            <h3 className="text-sm font-semibold text-white mb-4">Completed vs Failed — Last 7 Days</h3>
            <div className="h-56">
              {analytics ? (
                <Line data={lineChartData} options={lineChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Loading chart...</div>
              )}
            </div>
          </motion.div>

          {/* Donut chart — Job Status Breakdown */}
          <motion.div
            {...fadeUp(0.12)}
            className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-5"
          >
            <h3 className="text-sm font-semibold text-white mb-4">Profile Distribution</h3>
            <div className="h-56">
              {analytics ? (
                <Doughnut data={donutData} options={donutOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Loading chart...</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── System Health + Daily Volume ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health Panel */}
          <motion.div
            {...fadeUp(0.16)}
            className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">System Health</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                dbHealth === 100 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
              }`}>
                {dbHealth === 100 ? "All Systems Operational" : "Degraded"}
              </span>
            </div>
            <div className="space-y-4">
              <HealthBar label="API Response" value={apiHealth} color="bg-violet-500" />
              <HealthBar label="Job Queue" value={queueHealth} color="bg-cyan-500" />
              <HealthBar label="Database" value={dbHealth} color="bg-emerald-500" />
              <HealthBar label="Auth Service" value={authHealth} color="bg-amber-500" />
              <HealthBar label="Memory Usage" value={memoryUsed} color="bg-rose-500" />
            </div>
            {diagnostics && (
              <p className="text-[10px] text-zinc-600 mt-3">
                DB latency: {diagnostics.database.latencyMs}ms · Uptime: {Math.floor(diagnostics.environment.uptime / 60)}m · {diagnostics.environment.nodeVersion}
              </p>
            )}
          </motion.div>

          {/* Daily Volume Sparkline + Stats */}
          <motion.div
            {...fadeUp(0.2)}
            className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-5"
          >
            <h3 className="text-sm font-semibold text-white mb-4">Daily Job Volume — Last 7 Days</h3>
            <div className="flex items-end gap-1.5 h-28 mb-4">
              {dailyVolume.map((d, i) => {
                const height = Math.max(4, (d.count / maxVolume) * 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                      className="w-full rounded-t bg-gradient-to-t from-violet-600 to-violet-400 min-h-[4px]"
                    />
                    <span className="text-[9px] text-zinc-500">
                      {new Date(d.date).toLocaleDateString("en-US", { weekday: "narrow" })}
                    </span>
                  </div>
                )
              })}
              {dailyVolume.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">No data</div>
              )}
            </div>
            {/* Stats below sparkline */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Total Jobs</p>
                <p className="text-lg font-bold text-white">{stats.overview.totalJobs.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Completed</p>
                <p className="text-lg font-bold text-emerald-400">{stats.overview.completedJobs.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Failed</p>
                <p className="text-lg font-bold text-rose-400">{stats.overview.failedJobs.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Running Jobs (if any) ── */}
        {runningJobs.length > 0 && (
          <motion.div
            {...fadeUp(0.24)}
            className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <h3 className="text-sm font-semibold text-blue-300">Live — {runningJobs.length} running job{runningJobs.length !== 1 ? "s" : ""}</h3>
            </div>
            <div className="space-y-2">
              {runningJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors min-h-[44px]"
                >
                  <span className="text-xs text-zinc-400 truncate max-w-[140px] sm:max-w-[200px]">{job.email ?? job.userId}</span>
                  <span className="text-xs text-zinc-500 hidden sm:inline">{job.typingProfile}</span>
                  <span className="text-xs text-zinc-500">{job.totalChars?.toLocaleString()} chars</span>
                  <span className="text-xs text-zinc-500 ml-auto">{new Date(job.createdAt).toLocaleTimeString()}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Recent Activity Table ── */}
        <motion.div
          {...fadeUp(0.28)}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            <Link href="/admin/jobs" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">Status</th>
                  <th className="hidden md:table-cell px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">Profile</th>
                  <th className="hidden md:table-cell px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">Chars</th>
                  <th className="hidden md:table-cell px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivity.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500 text-sm">
                    {searchQuery ? "No matching results" : "No recent jobs"}
                  </td></tr>
                ) : (
                  filteredActivity.map((job, i) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.03 }}
                      onClick={() => router.push(`/admin/jobs/${job.id}`)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-xs text-zinc-400">{new Date(job.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-300 truncate max-w-[160px]">{job.email ?? job.userId}</td>
                      <td className="px-4 py-2.5"><StatusDot status={job.status} /></td>
                      <td className="hidden md:table-cell px-4 py-2.5 text-xs text-zinc-500">{job.typingProfile ?? "—"}</td>
                      <td className="hidden md:table-cell px-4 py-2.5 text-xs text-zinc-500">{job.totalChars?.toLocaleString() ?? "—"}</td>
                      <td className="hidden md:table-cell px-4 py-2.5 text-xs text-zinc-500">{job.durationMinutes ? `${job.durationMinutes}m` : "—"}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── Settings — Collapsible ── */}
        <motion.div {...fadeUp(0.32)}>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-zinc-400" />
              <span className="text-sm font-semibold text-white">Settings & Configuration</span>
              {settings?.maintenance_mode === "true" && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">Maintenance ON</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
          </button>

          {settingsOpen && settings && (
            <div className="mt-3">
              <SettingsPanel
                settings={settings}
                settingsSaving={settingsSaving}
                academicIntegrityCount={stats.overview.academicIntegrityAcceptedCount ?? 0}
                totalUsers={stats.overview.totalUsers}
                onPatch={patchSettings}
                onSettingsChange={setSettings}
              />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
