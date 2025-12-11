"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/lib/utils"
import type { JobStatus } from "@/types"

interface Job {
  id: string
  documentId: string
  totalChars: number
  currentIndex: number
  durationMinutes: number
  typingProfile: string
  status: JobStatus
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  errorCode?: string | null
}

export function JobHistory() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/jobs")
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error("Failed to load jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async (jobId: string) => {
    try {
      const response = await fetch("/api/jobs/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        await loadJobs()
        window.location.href = `/dashboard?jobId=${jobId}`
      }
    } catch (error) {
      console.error("Failed to resume job:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No jobs yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{job.status}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {job.currentIndex.toLocaleString()} / {job.totalChars.toLocaleString()} chars •{" "}
                  {formatDuration(job.durationMinutes)}
                </div>
                {job.errorCode && (
                  <div className="text-xs text-destructive mt-1">
                    Error: {job.errorCode}
                  </div>
                )}
              </div>
              {job.status === "paused" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResume(job.id)}
                >
                  Resume
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


