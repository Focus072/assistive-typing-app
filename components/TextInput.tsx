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
    <div className="space-y-2">
      <textarea
        id="text-input"
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder="Type or paste the text you want to be typed into Google Docs..."
        className={`w-full min-h-[200px] md:min-h-[260px] rounded-lg border resize-none focus:outline-none focus:ring-2 transition-all touch-manipulation px-4 md:px-6 py-4 md:py-6 text-base md:text-lg leading-relaxed font-sans ${
          isDark
            ? "bg-[#0a0a0a] border-white/30 text-white/90 placeholder:text-white/50 focus:ring-white/50 focus:border-white/50"
            : "bg-gray-50 border-black/30 text-black/90 placeholder:text-gray-500 focus:ring-black/30 focus:border-black/50"
        }`}
        aria-label="Text to type into Google Docs"
        aria-describedby="char-count"
        tabIndex={0}
      />
      
      {isNearLimit && (
        <p className={`text-xs ${isDark ? "text-red-400" : "text-red-600"}`}>
          {(maxChars - charCount).toLocaleString()} characters remaining
        </p>
      )}
      <p id="char-count" className="sr-only">
        {charCount} characters entered
      </p>
    </div>
  )
}
