"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Shield, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface AuditEntry {
  id: string
  adminEmail: string
  action: string
  details: string | null
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  tier_change: "bg-violet-500/20 text-violet-300",
  bulk_change_tier: "bg-violet-500/20 text-violet-300",
  settings_change: "bg-cyan-500/20 text-cyan-300",
  bulk_delete_jobs: "bg-rose-500/20 text-rose-300",
  announcement_create: "bg-amber-500/20 text-amber-300",
  announcement_publish: "bg-emerald-500/20 text-emerald-300",
  announcement_unpublish: "bg-zinc-500/20 text-zinc-300",
  announcement_delete: "bg-rose-500/20 text-rose-300",
}

export default function AuditLogPage() {
  const { status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login")
    if (status === "authenticated") fetchLogs()
  }, [status, router, page, actionFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: "50" })
      if (actionFilter) params.set("action", actionFilter)
      const res = await fetch(`/api/admin/audit?${params}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotalPages(data.pagination.totalPages)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
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
        <div className="max-w-7xl mx-auto pl-14 md:pl-4 pr-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Shield className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold">Audit Log</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
              className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 min-h-[44px]"
            >
              <option value="">All Actions</option>
              <option value="tier_change">Tier Change</option>
              <option value="bulk_change_tier">Bulk Tier Change</option>
              <option value="settings_change">Settings Change</option>
              <option value="bulk_delete_jobs">Bulk Delete Jobs</option>
              <option value="announcement_create">Announcement Create</option>
              <option value="announcement_publish">Announcement Publish</option>
              <option value="announcement_delete">Announcement Delete</option>
            </select>
            <button onClick={fetchLogs} disabled={loading} className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No audit log entries found</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const colorClass = ACTION_COLORS[log.action] ?? "bg-zinc-500/20 text-zinc-300"
                const isExpanded = expandedId === log.id
                return (
                  <div
                    key={log.id}
                    className="hover:bg-white/5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-zinc-600 font-mono shrink-0">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${colorClass}`}>
                        {log.action}
                      </span>
                      <span className="text-zinc-400 truncate">{log.adminEmail}</span>
                    </div>
                    {isExpanded && log.details && (
                      <pre className="mt-2 text-xs text-zinc-400 bg-zinc-900 p-3 rounded-lg overflow-x-auto">
                        {(() => { try { return JSON.stringify(JSON.parse(log.details), null, 2) } catch { return log.details } })()}
                      </pre>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1 text-zinc-400 hover:text-white disabled:text-zinc-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-zinc-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1 text-zinc-400 hover:text-white disabled:text-zinc-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
