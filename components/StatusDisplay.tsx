"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDuration, calculateTimeRemaining } from "@/lib/utils"
import type { JobStatus } from "@/types"

interface StatusDisplayProps {
  jobId: string | null
  status: JobStatus
  currentIndex: number
  totalChars: number
  durationMinutes: number
}

export function StatusDisplay({
  jobId,
  status,
  currentIndex,
  totalChars,
  durationMinutes,
}: StatusDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(durationMinutes)

  useEffect(() => {
    if (status === "running" && totalChars > 0) {
      const remaining = calculateTimeRemaining(
        totalChars,
        currentIndex,
        durationMinutes
      )
      setTimeRemaining(remaining)

      const interval = setInterval(() => {
        const newRemaining = calculateTimeRemaining(
          totalChars,
          currentIndex,
          durationMinutes
        )
        setTimeRemaining(newRemaining)
      }, 1000)

      return () => clearInterval(interval)
    } else if (status === "completed") {
      setTimeRemaining(0)
    }
  }, [status, currentIndex, totalChars, durationMinutes])

  const progress = totalChars > 0 ? (currentIndex / totalChars) * 100 : 0

  const statusLabels: Record<JobStatus, string> = {
    pending: "Pending",
    running: "Running",
    paused: "Paused",
    completed: "Completed",
    failed: "Failed",
    stopped: "Stopped",
    expired: "Expired",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Status</span>
            <span className="text-sm">{statusLabels[status]}</span>
          </div>
          <Progress value={progress} className="h-2" aria-label="Typing progress" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Characters</span>
            <p className="font-medium">
              {currentIndex.toLocaleString()} / {totalChars.toLocaleString()}
            </p>
          </div>
          {status === "running" && (
            <div>
              <span className="text-muted-foreground">Time Remaining</span>
              <p className="font-medium">
                {formatDuration(Math.ceil(timeRemaining))}
              </p>
            </div>
          )}
        </div>

        {status === "failed" && (
          <div className="text-sm text-destructive" role="alert">
            Job failed. Please check your Google Docs connection and try again.
          </div>
        )}
      </CardContent>
    </Card>
  )
}


