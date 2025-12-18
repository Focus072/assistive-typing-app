"use client"

import Link from "next/link"
import { JobHistory } from "@/components/JobHistory"
import { useDashboardTheme } from "../layout"

export default function HistoryPage() {
  const { isDark } = useDashboardTheme()
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/dashboard"
              className={`flex items-center gap-2 transition-colors ${
                isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold ${
            isDark ? "text-white" : "text-black"
          }`}>
            Job History
          </h1>
          <p className={`mt-2 ${
            isDark ? "text-white/60" : "text-black/60"
          }`}>
            View and manage all your typing jobs
          </p>
        </div>
      </div>

      {/* Job History Component */}
      <JobHistory />
    </div>
  )
}




