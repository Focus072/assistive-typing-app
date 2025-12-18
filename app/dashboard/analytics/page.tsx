"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useDashboardTheme } from "../layout"

interface JobStats {
  totalJobs: number
  totalChars: number
  totalTime: number
  avgWPM: number
  completedJobs: number
  failedJobs: number
  jobsByProfile: Record<string, number>
  jobsByDay: Array<{ date: string; count: number }>
}

export default function AnalyticsPage() {
  const { isDark } = useDashboardTheme()
  const [stats, setStats] = useState<JobStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d")

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/stats?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      // Error handled by UI state
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className={`flex items-center gap-2 transition-colors ${
              isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
            isDark ? "border-white/20 border-t-white" : "border-black/20 border-t-black"
          }`} />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className={`flex items-center gap-2 transition-colors ${
              isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <div className={`rounded-xl p-12 text-center border ${
          isDark ? "bg-[#101010] border-[#333] text-white/60" : "bg-white border-black/10 text-black/60"
        }`}>
          <p>No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link 
              href="/dashboard"
              className={`flex items-center gap-2 transition-colors ${
                isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold ${
            isDark ? "text-white" : "text-black"
          }`}>
            Analytics
          </h1>
          <p className={`mt-2 ${
            isDark ? "text-white/60" : "text-black/60"
          }`}>Track your typing activity and performance</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["7d", "30d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? isDark
                    ? "bg-white text-black border border-white"
                    : "bg-black text-white border border-black"
                  : isDark
                  ? "bg-white/5 border border-white/20 text-white hover:bg-white/10"
                  : "bg-white border border-black/20 text-black hover:bg-gray-50"
              }`}
              aria-pressed={timeRange === range}
              aria-label={`Filter by ${range === "7d" ? "7 days" : range === "30d" ? "30 days" : "all time"}`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Jobs"
          value={stats.totalJobs.toLocaleString()}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          color="violet"
        />
        <StatCard
          label="Characters Typed"
          value={`${(stats.totalChars / 1000).toFixed(1)}K`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="fuchsia"
        />
        <StatCard
          label="Avg Speed"
          value={`${stats.avgWPM} WPM`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          color="cyan"
        />
        <StatCard
          label="Success Rate"
          value={`${stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}%`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Distribution */}
        <div className={`rounded-xl p-6 border ${
          isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
        }`}>
          <h2 className={`text-lg font-semibold mb-4 ${
            isDark ? "text-white" : "text-black"
          }`}>Jobs by Profile</h2>
          <div className="space-y-3">
            {Object.entries(stats.jobsByProfile).map(([profile, count]) => (
              <div key={profile} className="flex items-center justify-between">
                <span className={`capitalize ${
                  isDark ? "text-white/70" : "text-black/70"
                }`}>{profile}</span>
                <div className="flex items-center gap-3">
                  <div className={`w-24 h-2 rounded-full overflow-hidden ${
                    isDark ? "bg-white/10" : "bg-gray-200"
                  }`}>
                    <div
                      className={`h-full rounded-full ${
                        isDark ? "bg-white" : "bg-black"
                      }`}
                      style={{ width: `${(count / stats.totalJobs) * 100}%` }}
                      role="progressbar"
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={stats.totalJobs}
                      aria-label={`${profile} profile: ${count} jobs`}
                    />
                  </div>
                  <span className={`font-medium w-8 text-right ${
                    isDark ? "text-white" : "text-black"
                  }`}>{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity */}
        <div className={`rounded-xl p-6 border ${
          isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
        }`}>
          <h2 className={`text-lg font-semibold mb-4 ${
            isDark ? "text-white" : "text-black"
          }`}>Daily Activity</h2>
          <div className="space-y-2">
            {stats.jobsByDay.slice(-7).map((day, idx) => {
              const maxCount = Math.max(...stats.jobsByDay.map(d => d.count))
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className={`text-xs w-16 ${
                    isDark ? "text-white/60" : "text-black/60"
                  }`}>
                    {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <div className={`flex-1 h-6 rounded-full overflow-hidden ${
                    isDark ? "bg-white/10" : "bg-gray-200"
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        isDark ? "bg-white" : "bg-black"
                      }`}
                      style={{ width: `${maxCount > 0 ? (day.count / maxCount) * 100 : 0}%` }}
                      role="progressbar"
                      aria-valuenow={day.count}
                      aria-valuemin={0}
                      aria-valuemax={maxCount}
                      aria-label={`${new Date(day.date).toLocaleDateString()}: ${day.count} jobs`}
                    />
                  </div>
                  <span className={`text-sm w-8 text-right ${
                    isDark ? "text-white" : "text-black"
                  }`}>{day.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: "violet" | "fuchsia" | "cyan" | "emerald"
}) {
  const { isDark } = useDashboardTheme()
  
  return (
    <div className={`rounded-xl md:rounded-2xl p-4 md:p-5 border shadow-sm ${
      isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"
        }`}>
          {icon}
        </div>
      </div>
      <p className={`text-xl md:text-2xl font-bold ${
        isDark ? "text-white" : "text-black"
      }`}>{value}</p>
      <p className={`text-xs md:text-sm mt-1 ${
        isDark ? "text-white/60" : "text-black/60"
      }`}>{label}</p>
    </div>
  )
}

