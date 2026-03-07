"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, BarChart3, RefreshCw } from "lucide-react"
import Link from "next/link"

interface AnalyticsData {
  jobsPerDay: Array<{ date: string; count: number }>
  successRatePerDay: Array<{ date: string; rate: number }>
  usersPerWeek: Array<{ week: string; count: number }>
  profileDistribution: Array<{ profile: string; count: number }>
}

const PROFILE_COLORS: Record<string, string> = {
  steady: "#8b5cf6",
  fatigue: "#f59e0b",
  burst: "#06b6d4",
  micropause: "#10b981",
  "typing-test": "#f43f5e",
}

function BarChart({ data, label, color = "#8b5cf6" }: { data: Array<{ label: string; value: number }>; label: string; color?: string }) {
  if (data.length === 0) return <p className="text-zinc-500 text-sm">No data</p>
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">{label}</p>
      <svg viewBox={`0 0 ${data.length * 20} 120`} className="w-full h-40" preserveAspectRatio="none">
        {data.map((d, i) => {
          const height = (d.value / maxValue) * 100
          return (
            <g key={i}>
              <rect
                x={i * 20 + 2}
                y={110 - height}
                width={16}
                height={height}
                fill={color}
                opacity={0.8}
                rx={2}
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
            </g>
          )
        })}
        <line x1="0" y1="110" x2={data.length * 20} y2="110" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </svg>
      <div className="flex justify-between text-xs text-zinc-600 mt-1">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

function LineChart({ data, label }: { data: Array<{ label: string; value: number }>; label: string }) {
  if (data.length === 0) return <p className="text-zinc-500 text-sm">No data</p>
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const width = data.length * 20
  const points = data.map((d, i) => `${i * 20 + 10},${110 - (d.value / maxValue) * 100}`).join(" ")

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">{label}</p>
      <svg viewBox={`0 0 ${width} 120`} className="w-full h-40" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={i * 20 + 10} cy={110 - (d.value / maxValue) * 100} r="3" fill="#06b6d4">
            <title>{`${d.label}: ${d.value}%`}</title>
          </circle>
        ))}
        <line x1="0" y1="110" x2={width} y2="110" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </svg>
      <div className="flex justify-between text-xs text-zinc-600 mt-1">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: Array<{ profile: string; count: number }> }) {
  if (data.length === 0) return <p className="text-zinc-500 text-sm">No data</p>
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">
        {data.map((d) => {
          const pct = d.count / total
          const dash = pct * circumference
          const currentOffset = offset
          offset += dash
          return (
            <circle
              key={d.profile}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={PROFILE_COLORS[d.profile] ?? "#71717a"}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 50 50)"
            >
              <title>{`${d.profile}: ${d.count} (${Math.round(pct * 100)}%)`}</title>
            </circle>
          )
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="bold">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map(d => (
          <div key={d.profile} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROFILE_COLORS[d.profile] ?? "#71717a" }} />
            <span className="text-zinc-400">{d.profile}</span>
            <span className="text-white font-medium">{d.count}</span>
            <span className="text-zinc-600">({Math.round((d.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login")
    if (status === "authenticated") fetchAnalytics()
  }, [status, router])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const formatWeek = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto pl-14 md:pl-4 pr-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold">Analytics</h1>
          </div>
          <button onClick={fetchAnalytics} disabled={loading} className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <BarChart
              data={(data?.jobsPerDay ?? []).map(d => ({ label: formatDate(d.date), value: d.count }))}
              label="Jobs per Day (Last 30 Days)"
              color="#8b5cf6"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <LineChart
              data={(data?.successRatePerDay ?? []).map(d => ({ label: formatDate(d.date), value: d.rate }))}
              label="Success Rate % (Last 30 Days)"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <BarChart
              data={(data?.usersPerWeek ?? []).map(d => ({ label: formatWeek(d.week), value: d.count }))}
              label="New Users per Week (Last 12 Weeks)"
              color="#10b981"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
            <p className="text-sm text-zinc-400 mb-3">Profile Distribution</p>
            <DonutChart data={data?.profileDistribution ?? []} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
