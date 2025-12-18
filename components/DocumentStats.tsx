"use client"

import Link from "next/link"
import type { DocumentFormat, TypingProfile } from "@/types"
import { formatConfigs } from "@/lib/document-formats"
import { formatDuration } from "@/lib/utils"

interface DocumentStatsProps {
  textContent: string
  durationMinutes: number
  typingProfile: TypingProfile
  documentFormat: DocumentFormat
  onClear: () => void
  onCopy: () => void
}

function calculateEstimatedWPM(
  totalChars: number,
  durationMinutes: number,
  profile: TypingProfile
): number {
  if (totalChars <= 0 || durationMinutes <= 0) return 0
  
  const baseWPM = (totalChars / 5) / durationMinutes
  
  const profileModifiers: Record<TypingProfile, number> = {
    steady: 1.0,
    fatigue: 0.8,
    burst: 1.1,
    micropause: 0.85,
    "typing-test": 1.0, // Will use actual test WPM if available
  }
  
  const modifier = profileModifiers[profile]
  return Math.round(baseWPM * modifier)
}

function countWords(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export function DocumentStats({
  textContent,
  durationMinutes,
  typingProfile,
  documentFormat,
  onClear,
  onCopy,
}: DocumentStatsProps) {
  const charCount = textContent.length
  const wordCount = countWords(textContent)
  const estimatedWPM = calculateEstimatedWPM(charCount, durationMinutes, typingProfile)
  const formatConfig = formatConfigs[documentFormat]

  return (
    <div className="space-y-4">
      {/* Document Statistics */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-black flex items-center gap-2">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Document Statistics
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white border border-black">
            <div className="text-xs text-gray-600 mb-1">Characters</div>
            <div className="text-lg font-bold text-black">{charCount.toLocaleString()}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-white border border-black">
            <div className="text-xs text-gray-600 mb-1">Words</div>
            <div className="text-lg font-bold text-black">{wordCount.toLocaleString()}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-white border border-black">
            <div className="text-xs text-gray-600 mb-1">Est. Time</div>
            <div className="text-lg font-bold text-black">{formatDuration(durationMinutes)}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-white border border-black">
            <div className="text-xs text-gray-600 mb-1">Est. Speed</div>
            <div className="text-lg font-bold text-black">{estimatedWPM} WPM</div>
          </div>
        </div>

        {/* Format Info */}
        {documentFormat !== "none" && (
          <div className="p-3 rounded-lg bg-gray-50 border border-black">
            <div className="text-xs font-medium text-black mb-1.5">Format: {formatConfig.name}</div>
            <div className="text-xs text-gray-700 space-y-0.5">
              <p>• Font: {formatConfig.fontFamily}, {formatConfig.fontSize}pt</p>
              <p>• Spacing: {formatConfig.lineSpacing === 2.0 ? "Double" : formatConfig.lineSpacing === 1.5 ? "1.5" : "Single"}</p>
              <p>• Profile: {typingProfile.charAt(0).toUpperCase() + typingProfile.slice(1)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-black flex items-center gap-2">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </label>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onClear}
            disabled={!textContent.trim()}
            className="px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Text
          </button>
          
          <button
            onClick={onCopy}
            disabled={!textContent.trim()}
            className="px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Text
          </button>
          
          <Link
            href="/dashboard/history"
            className="px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View History
          </Link>
        </div>
      </div>
    </div>
  )
}


