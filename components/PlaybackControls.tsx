"use client"

import React from "react"
import type { JobStatus } from "@/types"

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
  const isRunning = status === "running"
  const isPaused = status === "paused"
  const canControl = isRunning || isPaused

  // Debug: Log what button is being rendered
  React.useEffect(() => {
    console.log("[PlaybackControls] Rendered with:", {
      status,
      disabled,
      isRunning,
      isPaused,
      canControl,
      showStartButton: status === "pending" || status === "stopped" || status === "failed" || status === "expired" || status === "completed",
      hasOnStart: typeof onStart === "function",
    })
  }, [status, disabled, isRunning, isPaused, canControl, onStart])

  const handleStartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("[PlaybackControls] Start button clicked", {
      disabled,
      status,
      event: e,
      onStart: typeof onStart,
    })
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && onStart) {
      console.log("[PlaybackControls] Calling onStart handler")
      onStart()
    } else {
      console.warn("[PlaybackControls] Start button click ignored", {
        disabled,
        hasOnStart: !!onStart,
      })
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Playback controls">
      {status === "pending" || status === "stopped" || status === "failed" || status === "expired" || status === "completed" ? (
        <button
          type="button"
          onClick={handleStartClick}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg bg-black text-white font-semibold shadow-sm hover:bg-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation"
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
          className="flex-1 flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg bg-black text-white font-semibold shadow-sm hover:bg-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation"
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
          className="flex-1 flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg bg-white border border-black text-black font-semibold hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation"
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
          className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg bg-white border border-black text-black font-semibold hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all touch-manipulation"
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
