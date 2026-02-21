"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Users,
  Zap,
  Activity,
  CheckCircle2,
  CheckSquare,
  XCircle,
  Shield,
  Key,
  FileText,
  CreditCard,
  UserCog,
  ClipboardList,
  ArrowLeft,
  Settings,
  RefreshCw,
  Scale,
  Megaphone,
} from "lucide-react"

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
  topUser: {
    id: string
    email: string
    name: string | null
    jobCount: number
  } | null
  recentUsers: Array<{
    id: string
    email: string
    name: string | null
    image: string | null
    createdAt: Date
    accounts: Array<{ provider: string }>
  }>
  recentJobs: Array<{
    id: string
    userId: string
    status: string
    createdAt: Date
    completedAt: Date | null
    totalChars: number
  }>
}

interface ActivityJob {
  id: string
  userId: string
  email: string | null
  status: string
  totalChars: number | null
  durationMinutes: number | null
  typingProfile: string | null
  createdAt: string
  completedAt: string | null
  errorCode: string | null
}

interface AdminSettings {
  maintenance_mode: string | null
  FREE_MAX_JOBS_PER_DAY: string | null
  FREE_MAX_JOB_HISTORY: string | null
}

const STAT_CONFIG = [
  { key: "totalUsers", label: "Total Users", Icon: Users, color: "text-violet-400", borderTop: "border-t-violet-500" },
  { key: "totalJobs", label: "Total Jobs", Icon: Zap, color: "text-cyan-400", borderTop: "border-t-cyan-500" },
  { key: "activeJobs", label: "Active", Icon: Activity, color: "text-amber-400", borderTop: "border-t-amber-500" },
  { key: "successRate", label: "Success Rate", Icon: CheckCircle2, color: "text-emerald-400", borderTop: "border-t-emerald-500" },
  { key: "completedJobs", label: "Completed", Icon: CheckSquare, color: "text-green-400", borderTop: "border-t-green-500" },
  { key: "failedJobs", label: "Failed", Icon: XCircle, color: "text-rose-400", borderTop: "border-t-rose-500" },
  { key: "googleOAuthUsers", label: "Google OAuth", Icon: Shield, color: "text-blue-400", borderTop: "border-t-blue-500" },
  { key: "credentialUsers", label: "Credentials", Icon: Key, color: "text-slate-400", borderTop: "border-t-slate-500" },
  { key: "totalDocuments", label: "Documents", Icon: FileText, color: "text-indigo-400", borderTop: "border-t-indigo-500" },
  { key: "activeSubscribers", label: "Subscribers", Icon: CreditCard, color: "text-emerald-400", borderTop: "border-t-emerald-500" },
] as const

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "completed"
  const isFailed = status === "failed"
  const isActive = status === "running" || status === "paused"
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
  const glow = isSuccess ? "shadow-[0_0_12px_rgba(34,197,94,0.6)]" : isFailed ? "shadow-[0_0_12px_rgba(239,68,68,0.6)]" : isActive ? "shadow-[0_0_12px_rgba(59,130,246,0.6)]" : ""
  const bg = isSuccess ? "bg-emerald-500/30 text-emerald-300" : isFailed ? "bg-rose-500/30 text-rose-300" : isActive ? "bg-blue-500/30 text-blue-300" : "bg-slate-500/30 text-slate-300"
  return <span className={`${base} ${bg} ${glow}`}>{status}</span>
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activity, setActivity] = useState<ActivityJob[]>([])
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; name: string | null; image: string | null; planTier?: string; subscriptionStatus?: string | null; createdAt: string }>>([])
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login")
      return
    }
    if (status === "authenticated") {
      fetchStats()
      fetchActivity()
      fetchAllUsers()
      fetchSettings()
    }
  }, [status, router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/stats", { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
      if (response.status === 401) {
        setError("Unauthorized: You don't have admin access")
        return
      }
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Failed to fetch stats")
      setStats(await response.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard")
    } finally {
      setLoading(false)
    }
  }

  const fetchActivity = async () => {
    try {
      const res = await fetch("/api/admin/activity?limit=50", { cache: "no-store" })
      if (res.ok) setActivity((await res.json()).jobs ?? [])
    } catch {
      setActivity([])
    }
  }

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/admin/users?limit=50", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const users = (data.users ?? []).map((u: { id: string; email: string; name: string | null; image: string | null; planTier?: string; subscriptionStatus?: string | null; createdAt: string }) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
          planTier: u.planTier,
          subscriptionStatus: u.subscriptionStatus,
          createdAt: typeof u.createdAt === "string" ? u.createdAt : new Date(u.createdAt).toISOString(),
        }))
        setAllUsers(users)
      } else {
        setAllUsers([])
      }
    } catch {
      setAllUsers([])
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" })
      if (res.ok) setSettings(await res.json())
      else setSettings({ maintenance_mode: null, FREE_MAX_JOBS_PER_DAY: null, FREE_MAX_JOB_HISTORY: null })
    } catch {
      setSettings({ maintenance_mode: null, FREE_MAX_JOBS_PER_DAY: null, FREE_MAX_JOB_HISTORY: null })
    }
  }

  const patchSettings = async (updates: Partial<AdminSettings>) => {
    if (!settings) return
    setSettingsSaving(true)
    try {
      const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) })
      if (res.ok) setSettings(await res.json())
    } finally {
      setSettingsSaving(false)
    }
  }

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

  const getStatValue = (key: string) => {
    const o = stats.overview as Record<string, number>
    const v = o[key]
    if (key === "successRate") return `${v ?? 0}%`
    return (v ?? 0).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-zinc-400 mt-0.5">{session?.user?.email}</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-4 py-3 text-violet-400 hover:text-violet-300 hover:bg-white/5 rounded-lg transition-colors touch-manipulation text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Health Check - Real-Time Stat Overview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border-t-2 border-t-violet-500 p-4 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Platform Health Check</h2>
            <p className="text-sm text-zinc-400">Instant overview of your platform</p>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Users</p>
              <p className="text-xl sm:text-2xl font-bold text-violet-400">{stats.overview.totalUsers.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Subscribers</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">{(stats.overview.activeSubscribers ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Documents</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-400">{(stats.overview.totalDocuments ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={() => { fetchStats(); fetchActivity(); fetchAllUsers(); fetchSettings(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-colors text-sm font-medium shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </motion.div>

        {/* Stats Grid - compact */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {STAT_CONFIG.map(({ key, label, Icon, color, borderTop }) => (
            <motion.div
              key={key}
              variants={item}
              className={`rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border-t-2 ${borderTop} p-4`}
            >
              <div className={`${color} mb-1`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-zinc-400 truncate">{label}</p>
              <p className="text-lg sm:text-xl font-bold text-white truncate">{getStatValue(key)}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* All Users */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden mb-6 sm:mb-8"
        >
          <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">All Users</h2>
            <Link
              href="/admin/users"
              className="text-sm text-violet-400 hover:text-violet-300 font-medium"
            >
              Manage all →
            </Link>
          </div>
          <div className="p-4 sm:p-6 max-h-[400px] overflow-y-auto space-y-3">
            {allUsers.length === 0 ? (
              <p className="text-zinc-500 text-sm">No users</p>
            ) : (
              allUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-10 h-10 rounded-full shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 font-semibold shrink-0">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{user.name || user.email}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {user.planTier ?? "FREE"} · {user.subscriptionStatus ?? "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 shrink-0">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Users & Jobs - side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Recent Users</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {stats.recentUsers.length === 0 ? (
                <p className="text-zinc-500 text-sm">No recent users</p>
              ) : (
                stats.recentUsers.map((user) => {
                  const isGoogle = user.accounts.some((a) => a.provider === "google")
                  return (
                    <div key={user.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-10 h-10 rounded-full shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 font-semibold shrink-0">
                            {(user.name || user.email)[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{user.name || user.email}</p>
                          <p className="text-xs text-zinc-500">{isGoogle ? "Google OAuth" : "Credentials"}</p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 shrink-0">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Recent Jobs</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {stats.recentJobs.length === 0 ? (
                <p className="text-zinc-500 text-sm">No recent jobs</p>
              ) : (
                stats.recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white capitalize">{job.status}</p>
                      <p className="text-xs text-zinc-500">{job.totalChars.toLocaleString()} chars</p>
                    </div>
                    <p className="text-xs text-zinc-500 shrink-0">{new Date(job.createdAt).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity - modern data list / mobile cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden mb-6 sm:mb-8"
        >
          <div className="p-4 sm:p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Recent activity (job monitor)</h2>
          </div>

          {/* Table: mobile shows Time, User, Status only; desktop shows all columns */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Time</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">User</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Status</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Profile</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Chars</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500 text-sm">No recent jobs</td></tr>
                ) : (
                  activity.map((job) => (
                    <tr key={job.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 sm:px-4 py-3 text-sm text-zinc-300">{new Date(job.createdAt).toLocaleString()}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-zinc-300 truncate max-w-[140px] sm:max-w-[180px]">{job.email ?? job.userId}</td>
                      <td className="px-3 sm:px-4 py-3"><StatusBadge status={job.status} /></td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-400">{job.typingProfile ?? "—"}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-400">{job.totalChars != null ? job.totalChars.toLocaleString() : "—"}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-400">{job.durationMinutes != null ? `${job.durationMinutes} min` : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Settings - physical switch */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6 mb-6 sm:mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-400" />
            Settings
          </h2>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-sm font-medium text-zinc-300">Maintenance mode</span>
              <button
                type="button"
                onClick={() => patchSettings({ maintenance_mode: settings?.maintenance_mode === "true" ? "false" : "true" })}
                disabled={settingsSaving || !settings}
                className={`
                  relative w-16 h-10 rounded-full border-2 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-950
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${settings?.maintenance_mode === "true"
                    ? "bg-violet-600 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                    : "bg-zinc-800 border-zinc-600 hover:border-zinc-500"
                  }
                `}
              >
                <span
                  className={`
                    absolute top-1 w-7 h-7 rounded-full bg-white shadow-lg transition-transform duration-200
                    ${settings?.maintenance_mode === "true" ? "left-8" : "left-1"}
                  `}
                />
              </button>
              <span className="text-sm text-zinc-500">{settings?.maintenance_mode === "true" ? "On" : "Off"}</span>
            </div>
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Free tier limits (overrides)</h3>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Max jobs per day</label>
                  <input
                    type="number"
                    min={0}
                    value={settings?.FREE_MAX_JOBS_PER_DAY ?? ""}
                    onChange={(e) => setSettings((s) => s ? { ...s, FREE_MAX_JOBS_PER_DAY: e.target.value || null } : s)}
                    onBlur={(e) => patchSettings({ FREE_MAX_JOBS_PER_DAY: e.target.value ? String(e.target.value) : null })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-24 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Max job history</label>
                  <input
                    type="number"
                    min={0}
                    value={settings?.FREE_MAX_JOB_HISTORY ?? ""}
                    onChange={(e) => setSettings((s) => s ? { ...s, FREE_MAX_JOB_HISTORY: e.target.value || null } : s)}
                    onBlur={(e) => patchSettings({ FREE_MAX_JOB_HISTORY: e.target.value ? String(e.target.value) : null })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-24 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="10"
                  />
                </div>
                <span className="text-xs text-zinc-500">Leave empty for defaults. Save on blur.</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Legal Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6 mb-6 sm:mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-zinc-400" />
            Legal Settings
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-sm font-medium text-zinc-300">Academic integrity accepted</span>
              <span className="text-xl font-bold text-violet-400">
                {(stats.overview.academicIntegrityAcceptedCount ?? 0).toLocaleString()}
              </span>
              <span className="text-sm text-zinc-500">
                of {stats.overview.totalUsers.toLocaleString()} users
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Users must accept the academic integrity acknowledgment before accessing the tool.
            </p>
            <Link
              href="/admin/users?accepted=1"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              View accepted members →
            </Link>
          </div>
        </motion.div>

        {/* Quick Links - Command style */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/users"
              className="group flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/50 transition-all"
            >
              <UserCog className="w-5 h-5 text-violet-400 group-hover:text-violet-300" />
              <div>
                <h3 className="font-medium text-white">User Management</h3>
                <p className="text-xs text-zinc-500">View and manage all users</p>
              </div>
            </Link>
            <Link
              href="/admin/jobs"
              className="group flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/50 transition-all"
            >
              <ClipboardList className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
              <div>
                <h3 className="font-medium text-white">Job Monitoring</h3>
                <p className="text-xs text-zinc-500">Monitor all typing jobs</p>
              </div>
            </Link>
            <Link
              href="/admin/announcements"
              className="group flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/50 transition-all"
            >
              <Megaphone className="w-5 h-5 text-violet-400 group-hover:text-violet-300" />
              <div>
                <h3 className="font-medium text-white">Announcements</h3>
                <p className="text-xs text-zinc-500">Publish updates to landing page</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
