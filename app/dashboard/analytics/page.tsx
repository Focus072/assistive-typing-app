"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

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
  const [stats, setStats] = useState<JobStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d")

  useEffect(() => {
    loadStats()
  }, [timeRange])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/stats?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to load stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-300 rounded-full animate-spin border-t-black" />
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
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-gray-600">No analytics data available</p>
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
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-black">
            <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-gray-600 mt-2">Track your typing activity and performance</p>
        </div>

        <div className="flex gap-2">
          {(["7d", "30d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? "bg-black border border-black text-white"
                  : "bg-white border border-black text-black hover:bg-gray-50"
              }`}
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
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Jobs by Profile</h2>
          <div className="space-y-3">
            {Object.entries(stats.jobsByProfile).map(([profile, count]) => (
              <div key={profile} className="flex items-center justify-between">
                <span className="text-gray-700 capitalize">{profile}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full"
                      style={{ width: `${(count / stats.totalJobs) * 100}%` }}
                    />
                  </div>
                  <span className="text-black font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Daily Activity</h2>
          <div className="space-y-2">
            {stats.jobsByDay.slice(-7).map((day, idx) => {
              const maxCount = Math.max(...stats.jobsByDay.map(d => d.count))
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-16">
                    {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full transition-all"
                      style={{ width: `${maxCount > 0 ? (day.count / maxCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-black text-sm w-8 text-right">{day.count}</span>
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
  return (
    <div className="rounded-xl md:rounded-2xl p-4 md:p-5 bg-white border border-black shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
          {icon}
        </div>
      </div>
      <p className="text-xl md:text-2xl font-bold text-black">{value}</p>
      <p className="text-xs md:text-sm text-gray-600 mt-1">{label}</p>
    </div>
  )
}

