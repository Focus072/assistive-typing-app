"use client"

import { useEffect, useState, useRef, useCallback, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, RefreshCw, Download, Trash2, Loader2 } from "lucide-react"
import { MobileMenuButton } from "../_components/admin-sidebar"

interface Job {
  id: string
  userId: string
  documentId: string | null
  totalChars: number
  currentIndex: number
  durationMinutes: number
  typingProfile: string
  status: string
  createdAt: string
  updatedAt: string | null
  completedAt: string | null
  errorCode: string | null
  user: {
    email: string
    name: string | null
  }
}

interface JobsResponse {
  jobs: Job[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <AdminJobsContent />
    </Suspense>
  )
}

function AdminJobsContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [userIdFilter, setUserIdFilter] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const refreshRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const userId = searchParams.get("userId")
    setUserIdFilter(userId || null)
    if (!userId) setUserEmail(null)
  }, [searchParams])

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      let url = `/api/admin/jobs?page=${pagination.page}&limit=${pagination.limit}`
      if (statusFilter) url += `&status=${statusFilter}`
      if (userIdFilter) url += `&userId=${userIdFilter}`
      const response = await fetch(url)
      if (response.status === 401) { setError("Unauthorized"); return }
      if (!response.ok) throw new Error("Failed to fetch jobs")
      const data: JobsResponse = await response.json()
      setJobs(data.jobs)
      setPagination(data.pagination)
      if (data.jobs.length > 0 && data.jobs[0].user) setUserEmail(data.jobs[0].user.email)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter, userIdFilter])

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/admin/login"); return }
    if (status === "authenticated") fetchJobs()
  }, [status, router, fetchJobs])

  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(fetchJobs, 5000)
    } else if (refreshRef.current) {
      clearInterval(refreshRef.current)
      refreshRef.current = null
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [autoRefresh, fetchJobs])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === jobs.length) setSelected(new Set())
    else setSelected(new Set(jobs.map(j => j.id)))
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/admin/bulk/delete-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: Array.from(selected) }),
      })
      if (res.ok) {
        setSelected(new Set())
        fetchJobs()
      }
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleExport = () => {
    let url = "/api/admin/export/jobs"
    if (statusFilter) url += `?status=${statusFilter}`
    window.open(url, "_blank")
  }

  const getStatusClasses = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald-500/20 text-emerald-300"
      case "running": return "bg-blue-500/20 text-blue-300"
      case "paused": return "bg-amber-500/20 text-amber-300"
      case "failed": return "bg-rose-500/20 text-rose-300"
      default: return "bg-zinc-500/20 text-zinc-300"
    }
  }

  // Sort: running jobs first
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1
    if (b.status === "running" && a.status !== "running") return 1
    return 0
  })

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-rose-400 text-xl font-semibold mb-2">Error</div>
          <p className="text-zinc-400 mb-4">{error}</p>
          <Link href="/admin" className="inline-block px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <MobileMenuButton />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white">Job Monitoring</h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 truncate">
                  {userIdFilter && userEmail
                    ? `Jobs for ${userEmail} (${pagination.total.toLocaleString()} total)`
                    : `${pagination.total.toLocaleString()} total jobs`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={handleExport}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] px-2 sm:px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Export CSV</span>
              </button>
              <label className="flex items-center gap-1 sm:gap-2 min-h-[44px] px-2 sm:px-3 py-2 text-sm text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-white/10"
                />
                <span className="hidden sm:inline">Auto-refresh</span>
                {autoRefresh && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>}
              </label>
              <Link
                href="/admin"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] px-2 sm:px-4 py-3 text-violet-400 hover:text-violet-300 hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters + Bulk Actions */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
            className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="">All Statuses</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          {userIdFilter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/20 text-violet-300 rounded-lg text-sm">
              <span>User: {userEmail || userIdFilter}</span>
              <Link href="/admin/jobs" className="hover:text-white font-bold">✕</Link>
            </div>
          )}

          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-3 py-2 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete {selected.size} selected
            </button>
          )}

          <button
            onClick={fetchJobs}
            disabled={loading}
            className="ml-auto flex items-center justify-center min-h-[44px] min-w-[44px] px-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Jobs Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-3 sm:px-4 py-3 text-left">
                    <input type="checkbox" checked={selected.size === jobs.length && jobs.length > 0} onChange={toggleAll} className="rounded border-white/10" />
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">User</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Status</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Progress</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Duration</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Profile</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No jobs found</td>
                  </tr>
                ) : (
                  sortedJobs.map((job) => {
                    const progress = job.totalChars > 0 ? Math.round((job.currentIndex / job.totalChars) * 100) : 0
                    return (
                      <tr
                        key={job.id}
                        onClick={() => router.push(`/admin/jobs/${job.id}`)}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="px-3 sm:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleSelect(job.id)} className="rounded border-white/10" />
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="text-sm font-medium text-white truncate max-w-[120px] sm:max-w-none">{job.user.email}</div>
                          <div className="text-xs text-zinc-500 sm:hidden">
                            {job.typingProfile} · {progress}%
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(job.status)}`}>
                            {job.status === "running" && (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                              </span>
                            )}
                            {job.status}
                          </span>
                          {job.errorCode && <div className="text-xs text-rose-400 mt-1">{job.errorCode}</div>}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-white/10 rounded-full h-1.5">
                              <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-zinc-400">{progress}%</span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">{job.currentIndex}/{job.totalChars}</div>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-300">{job.durationMinutes}m</td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-400">{job.typingProfile}</td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          <div className="text-sm text-zinc-300">{new Date(job.createdAt).toLocaleDateString()}</div>
                          {job.completedAt && <div className="text-xs text-zinc-500">{new Date(job.completedAt).toLocaleDateString()}</div>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white/5 px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
              <p className="text-xs sm:text-sm text-zinc-400">
                <span className="text-white font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>–<span className="text-white font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                <span className="text-white font-medium">{pagination.total}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <span className="px-2 py-2 text-sm text-zinc-400 self-center">{pagination.page}/{pagination.totalPages}</span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
