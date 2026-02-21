"use client"

import { motion } from "framer-motion"
import {
  Users, Zap, Activity, CheckCircle2, CheckSquare,
  XCircle, Shield, Key, FileText, CreditCard,
} from "lucide-react"

interface AdminOverview {
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
}

interface StatsGridProps {
  overview: AdminOverview
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

export function StatsGrid({ overview }: StatsGridProps) {
  const getValue = (key: string) => {
    const v = (overview as unknown as Record<string, number>)[key]
    if (key === "successRate") return `${v ?? 0}%`
    return (v ?? 0).toLocaleString()
  }

  return (
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
          <p className="text-lg sm:text-xl font-bold text-white truncate">{getValue(key)}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}
