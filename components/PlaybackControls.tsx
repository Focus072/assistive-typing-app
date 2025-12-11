"use client"

import { Button } from "@/components/ui/button"
import { Play, Pause, Square, RotateCcw } from "lucide-react"
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

  return (
    <div className="flex gap-2" role="group" aria-label="Playback controls">
      {status === "pending" || status === "stopped" || status === "failed" || status === "expired" ? (
        <Button
          onClick={onStart}
          disabled={disabled}
          aria-label="Start typing"
          tabIndex={0}
        >
          <Play className="mr-2 h-4 w-4" />
          Start
        </Button>
      ) : isPaused ? (
        <Button
          onClick={onResume}
          disabled={disabled}
          aria-label="Resume typing"
          tabIndex={0}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Resume
        </Button>
      ) : (
        <Button
          onClick={onPause}
          disabled={disabled}
          variant="outline"
          aria-label="Pause typing"
          tabIndex={0}
        >
          <Pause className="mr-2 h-4 w-4" />
          Pause
        </Button>
      )}
      
      {canControl && (
        <Button
          onClick={onStop}
          disabled={disabled}
          variant="destructive"
          aria-label="Stop typing permanently"
          tabIndex={0}
        >
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
      )}
    </div>
  )
}


