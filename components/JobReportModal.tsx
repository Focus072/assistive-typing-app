"use client"

import { useEffect, useState, useRef } from "react"
import { scoreWPM } from "@/lib/scoring"

interface WPMPoint {
  progress: number
  wpm: number
}

interface ReportData {
  job: {
    totalChars: number
    durationMinutes: number
    typingProfile: string
    testWPM?: number | null
    createdAt?: string | null
    completedAt?: string | null
  }
  wpmTimeline: WPMPoint[]
  avgWPM: number
}

interface JobReportModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string | null
  totalChars: number
  isDark: boolean
}

export function JobReportModal({ isOpen, onClose, jobId, totalChars, isDark }: JobReportModalProps) {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen || !jobId) return
    setLoading(true)
    fetch(`/api/jobs/${jobId}/report`)
      .then(r => r.json())
      .then((d: ReportData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [isOpen, jobId])

  // Reset on close
  useEffect(() => {
    if (!isOpen) setData(null)
  }, [isOpen])

  // Focus close button when opened
  useEffect(() => {
    if (isOpen) closeRef.current?.focus()
  }, [isOpen])

  // Keyboard dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    if (isOpen) window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const bg = isDark ? "bg-gray-900 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"
  const pillBg = isDark ? "bg-gray-800" : "bg-gray-50"
  const pillLabel = isDark ? "text-gray-400" : "text-gray-500"
  const pillValue = isDark ? "text-gray-100 font-semibold" : "text-gray-900 font-semibold"

  const avgWPM = data?.avgWPM ?? 0
  const { score: humanScore, colorClass } = avgWPM > 0 ? scoreWPM(avgWPM) : { score: 0, colorClass: "green" as const }
  const scoreColor = colorClass === "green" ? "text-green-500" : colorClass === "amber" ? "text-amber-500" : "text-red-500"

  // Compute actual elapsed time from createdAt → completedAt
  const actualMinutes = (() => {
    const start = data?.job.createdAt ? new Date(data.job.createdAt).getTime() : null
    const end = data?.job.completedAt ? new Date(data.job.completedAt).getTime() : null
    if (start && end && end > start) return Math.round((end - start) / 60000)
    return null
  })()
  const duration = actualMinutes ?? data?.job.durationMinutes ?? 0
  const durationLabel = duration > 0 ? `${duration} min` : "—"
  const chars = data?.job.totalChars ?? totalChars

  // SVG chart
  const W = 280
  const H = 70
  const MAX_WPM = 120
  const REF_WPM = 60
  const timeline = data?.wpmTimeline ?? []
  const svgPoints = timeline
    .map(p => `${Math.round(p.progress * W)},${Math.round((1 - Math.min(p.wpm, MAX_WPM) / MAX_WPM) * H)}`)
    .join(" ")
  const refY = Math.round((1 - REF_WPM / MAX_WPM) * H)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 ${bg}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-xl">✓</span>
            <h2 className="text-lg font-semibold">Typing Complete</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close report"
            className={`rounded-full p-1.5 transition-colors ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? "border-gray-500" : "border-gray-300"}`} />
          </div>
        )}

        {!loading && (
          <>
            {/* Stats pills */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { label: "Characters", value: chars.toLocaleString() },
                { label: "Avg WPM", value: avgWPM > 0 ? String(avgWPM) : "—" },
                { label: "Human Score", value: avgWPM > 0 ? `${humanScore}/100` : "—", extra: scoreColor },
                { label: "Duration", value: durationLabel },
              ].map(({ label, value, extra }) => (
                <div key={label} className={`rounded-xl px-3 py-2.5 ${pillBg}`}>
                  <div className={`text-xs mb-0.5 ${pillLabel}`}>{label}</div>
                  <div className={`text-sm ${pillValue} ${extra ?? ""}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* WPM chart */}
            {timeline.length > 1 && (
              <div className="mb-5">
                <div className={`text-xs mb-1.5 ${pillLabel}`}>WPM over time</div>
                <svg
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full rounded-lg overflow-hidden"
                  style={{ background: isDark ? "#1f2937" : "#f9fafb" }}
                >
                  {/* 60 WPM reference line */}
                  <line
                    x1={0} y1={refY} x2={W} y2={refY}
                    stroke={isDark ? "#4b5563" : "#d1d5db"}
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                  <text x={W - 4} y={refY - 3} textAnchor="end" fontSize="8" fill={isDark ? "#6b7280" : "#9ca3af"}>60</text>
                  {/* WPM line */}
                  {svgPoints && (
                    <polyline
                      points={svgPoints}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
        >
          Close
        </button>
      </div>
    </div>
  )
}
