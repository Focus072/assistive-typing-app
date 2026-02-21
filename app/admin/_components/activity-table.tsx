"use client"

import { motion } from "framer-motion"

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

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "completed"
  const isFailed = status === "failed"
  const isActive = status === "running" || status === "paused"
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
  const glow = isSuccess
    ? "shadow-[0_0_12px_rgba(34,197,94,0.6)]"
    : isFailed
    ? "shadow-[0_0_12px_rgba(239,68,68,0.6)]"
    : isActive
    ? "shadow-[0_0_12px_rgba(59,130,246,0.6)]"
    : ""
  const bg = isSuccess
    ? "bg-emerald-500/30 text-emerald-300"
    : isFailed
    ? "bg-rose-500/30 text-rose-300"
    : isActive
    ? "bg-blue-500/30 text-blue-300"
    : "bg-slate-500/30 text-slate-300"
  return <span className={`${base} ${bg} ${glow}`}>{status}</span>
}

export function ActivityTable({ activity }: { activity: ActivityJob[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden mb-6 sm:mb-8"
    >
      <div className="p-4 sm:p-6 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Recent activity (job monitor)</h2>
      </div>
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
  )
}
