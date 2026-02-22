"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { PlanTier } from "@/lib/constants/tiers"

const TIER_LIMITS: Record<string, { maxJobsPerDay: number | null; maxDurationMinutes: number | null; label: string }> = {
  FREE:      { maxJobsPerDay: 5,    maxDurationMinutes: 60,   label: "Free" },
  BASIC:     { maxJobsPerDay: 20,   maxDurationMinutes: 180,  label: "Basic" },
  PRO:       { maxJobsPerDay: 50,   maxDurationMinutes: 360,  label: "Pro" },
  UNLIMITED: { maxJobsPerDay: null, maxDurationMinutes: null, label: "Unlimited" },
  ADMIN:     { maxJobsPerDay: null, maxDurationMinutes: null, label: "Admin" },
}

interface Job {
  id: string
  documentId: string | null
  status: string
  totalChars: number
  currentIndex: number
  durationMinutes: number
  createdAt: string
}

interface DashboardSidebarProps {
  isDark: boolean
}

function getRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-green-400",
  running: "bg-blue-400 animate-pulse",
  paused: "bg-yellow-400",
  failed: "bg-red-400",
  stopped: "bg-gray-400",
  expired: "bg-orange-400",
}

export function DashboardSidebar({ isDark }: DashboardSidebarProps) {
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<{ totalChars: number; totalJobs: number } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) setCollapsed(saved === "true")
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("sidebar-collapsed", String(next))
  }

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const list: Job[] = Array.isArray(data.jobs) ? data.jobs : []
        setAllJobs(list)
        setRecentJobs(list.slice(0, 4))
      })
      .catch(() => {})

    fetch("/api/jobs/stats?range=7d")
      .then((r) => r.json())
      .then((data) => {
        setStats({ totalChars: data.totalChars ?? 0, totalJobs: data.totalJobs ?? 0 })
      })
      .catch(() => {})
  }, [])

  const wordsThisWeek = stats ? Math.round(stats.totalChars / 5).toLocaleString() : null

  // Plan limits & today's usage
  const planTier = (session?.user as { planTier?: PlanTier } | undefined)?.planTier ?? "FREE"
  const limits = TIER_LIMITS[planTier] ?? TIER_LIMITS.FREE
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const jobsToday = allJobs.filter((j) => new Date(j.createdAt) >= todayStart).length
  const sessionsLeft = limits.maxJobsPerDay !== null ? limits.maxJobsPerDay - jobsToday : null
  const maxHours = limits.maxDurationMinutes !== null ? limits.maxDurationMinutes / 60 : null

  const border = isDark ? "border-white/[0.08]" : "border-black/[0.07]"
  const mutedText = isDark ? "text-white/35" : "text-black/35"
  const bodyText = isDark ? "text-white/65" : "text-black/65"
  const hover = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]"
  const statBg = isDark ? "bg-white/[0.04]" : "bg-black/[0.03]"

  return (
    <aside
      className={`hidden xl:flex flex-col flex-shrink-0 border-r sticky top-20 overflow-hidden transition-all duration-200 ${border} ${
        isDark ? "bg-black/30" : "bg-white/50"
      }`}
      style={{
        width: collapsed ? "3.25rem" : "12rem",
        height: "calc(100vh - 5rem)",
      }}
    >
      {/* Header row */}
      <div
        className={`flex items-center border-b py-3 flex-shrink-0 ${border} ${
          collapsed ? "justify-center px-0" : "justify-between px-3"
        }`}
      >
        {!collapsed && (
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>
            Quick access
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${mutedText} ${hover}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">

        {/* Stats card */}
        {wordsThisWeek !== null && (
          collapsed ? (
            <div
              className="flex justify-center"
              title={`${wordsThisWeek} words this week · ${stats?.totalJobs} sessions`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statBg}`}>
                <svg className={`w-4 h-4 ${mutedText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          ) : (
            <div className={`mx-2.5 rounded-lg p-3 ${statBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${mutedText}`}>
                This week
              </p>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-semibold ${isDark ? "text-white/80" : "text-black/80"}`}>
                  {wordsThisWeek}
                </span>
                <span className={`text-xs ${mutedText}`}>words</span>
              </div>
              <p className={`text-xs mt-0.5 ${mutedText}`}>
                {stats?.totalJobs} {stats?.totalJobs === 1 ? "session" : "sessions"}
              </p>

              {/* Plan usage */}
              <div className={`mt-2.5 pt-2.5 border-t space-y-1 ${isDark ? "border-white/[0.07]" : "border-black/[0.07]"}`}>
                {sessionsLeft !== null ? (
                  <p className={`text-[10px] leading-snug ${
                    sessionsLeft <= 2
                      ? isDark ? "text-orange-400/80" : "text-orange-600"
                      : mutedText
                  }`}>
                    {sessionsLeft} of {limits.maxJobsPerDay} sessions left today
                  </p>
                ) : (
                  <p className={`text-[10px] ${mutedText}`}>Unlimited sessions</p>
                )}
                {maxHours !== null ? (
                  <p className={`text-[10px] ${mutedText}`}>
                    Up to {maxHours}h per session
                  </p>
                ) : (
                  <p className={`text-[10px] ${mutedText}`}>Unlimited duration</p>
                )}
                <p className={`text-[10px] ${mutedText}`}>
                  {limits.label} plan
                </p>
              </div>
            </div>
          )
        )}

        {/* Recent sessions */}
        {recentJobs.length > 0 && (
          <div>
            {!collapsed && (
              <p className={`px-3 text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${mutedText}`}>
                Recent
              </p>
            )}
            <div className="space-y-px px-1.5">
              {recentJobs.map((job) => {
                const dotColor = STATUS_DOT[job.status] ?? "bg-gray-400"
                const progress =
                  job.totalChars > 0
                    ? Math.round((job.currentIndex / job.totalChars) * 100)
                    : 0
                const time = getRelativeTime(new Date(job.createdAt))

                if (collapsed) {
                  return (
                    <Link
                      key={job.id}
                      href="/dashboard/history"
                      className={`flex items-center justify-center py-2.5 rounded-lg transition-colors ${hover}`}
                      title={`${job.status} · ${progress}% · ${time}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    </Link>
                  )
                }

                return (
                  <Link
                    key={job.id}
                    href="/dashboard/history"
                    className={`flex items-start gap-2.5 px-2 py-2 rounded-lg transition-colors ${hover}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium capitalize truncate ${bodyText}`}>
                        {job.status}
                        {job.totalChars > 0 && ` · ${progress}%`}
                      </p>
                      <p className={`text-xs ${mutedText}`}>{time}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className={`flex-shrink-0 border-t py-2 px-1.5 space-y-px ${border}`}>
        {[
          {
            href: "/dashboard/history",
            label: "History",
            d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
          },
          {
            href: "/dashboard/account",
            label: "Account",
            d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
          },
        ].map(({ href, label, d }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${mutedText} ${hover} ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? label : undefined}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
            </svg>
            {!collapsed && <span className="text-xs">{label}</span>}
          </Link>
        ))}
      </div>
    </aside>
  )
}
