"use client"

import Link from "next/link"
import { JobHistory } from "@/components/JobHistory"

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-white">
            <span className="gradient-text">Job</span> History
          </h1>
          <p className="text-white/60 mt-2">
            View and manage all your typing jobs
          </p>
        </div>
      </div>

      {/* Job History Component */}
      <JobHistory />
    </div>
  )
}

