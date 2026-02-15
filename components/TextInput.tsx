"use client"

import { useRef } from "react"
import { useDashboardTheme } from "@/app/dashboard/theme-context"

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  maxChars?: number
}

export function TextInput({ value, onChange, maxChars = 50000 }: TextInputProps) {
  const { isDark } = useDashboardTheme()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const charCount = value.length
  const isNearLimit = charCount > maxChars * 0.9
  const percentage = (charCount / maxChars) * 100

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxChars) {
      onChange(newValue)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="text-input" className={`text-sm font-medium flex items-center gap-2 ${
          isDark ? "text-white" : "text-black"
        }`}>
          <svg className={`w-4 h-4 ${isDark ? "text-white" : "text-black"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Text to Type
        </label>
        <div className="flex items-center gap-3">
          <div className={`w-20 h-1.5 rounded-full overflow-hidden ${
            isDark ? "bg-white/10" : "bg-gray-200"
          }`}>
            <div 
              className={`h-full rounded-full transition-all ${
                isNearLimit ? 'bg-red-500' : (isDark ? 'bg-white' : 'bg-black')
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-mono ${
            isNearLimit
              ? "text-red-600"
              : isDark
              ? "text-white/60"
              : "text-gray-600"
          }`}>
            {charCount.toLocaleString()}
          </span>
        </div>
      </div>
      
      <textarea
        id="text-input"
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder="Type or paste the text you want to be typed into Google Docs..."
        className={`w-full min-h-[120px] md:min-h-[180px] rounded-lg border resize-none focus:outline-none focus:ring-2 transition-all touch-manipulation px-4 md:px-6 py-4 md:py-6 text-base md:text-lg leading-relaxed font-sans ${
          isDark
            ? "bg-[#0a0a0a] border-white/30 text-white/90 placeholder:text-white/50 focus:ring-white/50 focus:border-white/50"
            : "bg-gray-50 border-black/30 text-black/90 placeholder:text-gray-500 focus:ring-black/30 focus:border-black/50"
        }`}
        aria-label="Text to type into Google Docs"
        aria-describedby="char-count"
        tabIndex={0}
      />
      
      <p id="char-count" className="sr-only">
        {charCount} characters entered
      </p>
    </div>
  )
}
