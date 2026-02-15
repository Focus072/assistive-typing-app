"use client"

import type { JobStatus } from "@/types"
import { useDashboardTheme } from "@/app/dashboard/theme-context"

interface PlaybackControlsProps {
  status: JobStatus
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  disabled?: boolean
}

export function PlaybackControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
}: PlaybackControlsProps) {
  const { isDark } = useDashboardTheme()
  const isRunning = status === "running"
  const isPaused = status === "paused"
  const canControl = isRunning || isPaused

  return (
    <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Playback controls">
      {status === "pending" || status === "stopped" || status === "failed" || status === "expired" || status === "completed" ? (
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg font-semibold shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation ${
            isDark
              ? "bg-white text-black hover:bg-white/90"
              : "bg-black text-white hover:bg-gray-900"
          }`}
          aria-label="Start typing"
          tabIndex={0}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="hidden sm:inline">Start Typing</span>
          <span className="sm:hidden">Start</span>
        </button>
      ) : isPaused ? (
        <button
          onClick={onResume}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg font-semibold shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation ${
            isDark
              ? "bg-white text-black hover:bg-white/90"
              : "bg-black text-white hover:bg-gray-900"
          }`}
          aria-label="Resume typing"
          tabIndex={0}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Resume
        </button>
      ) : (
        <button
          onClick={onPause}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg border font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation ${
            isDark
              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
              : "bg-white border-black text-black hover:bg-gray-50"
          }`}
          aria-label="Pause typing"
          tabIndex={0}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
          </svg>
          Pause
        </button>
      )}
      
      {canControl && (
        <button
          onClick={onStop}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg border font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation ${
            isDark
              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
              : "bg-white border-black text-black hover:bg-gray-50"
          }`}
          aria-label="Stop typing permanently"
          tabIndex={0}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
          <span className="hidden sm:inline">Stop</span>
        </button>
      )}
    </div>
  )
}
