"use client"

import { useDashboardTheme } from "@/app/dashboard/theme-context"
import { formatConfigs } from "@/lib/document-formats"
import type { DocumentFormat } from "@/types"
import type { FormatMetadata } from "@/components/FormatMetadataModal"

interface TextPreviewProps {
  text: string
  format: DocumentFormat
  formatMetadata?: FormatMetadata
}

export function TextPreview({ text, format, formatMetadata }: TextPreviewProps) {
  const { isDark } = useDashboardTheme()
  const config = formatConfigs[format]
  
  if (!text.trim()) {
    return null
  }

  // Get first paragraph or first 300 chars for preview
  const firstLine = text.split('\n')[0]
  const previewText = firstLine.length > 0 ? firstLine : text.substring(0, 300)
  const lines = previewText.length > 200 ? previewText.substring(0, 200) + '...' : previewText

  // Convert inches to pixels (approximate: 1 inch = 96px at 100% zoom)
  const marginPx = config.margins.left * 96
  const indentPx = config.firstLineIndent * 96
  const fontSizePx = config.fontSize * 1.33 // Convert pt to px (approximate)

  return (
    <div className={`mt-4 rounded-lg border overflow-hidden ${
      isDark
        ? "bg-[#0a0a0a] border-white/10"
        : "bg-white border-black/10"
    }`}>
      <div className={`px-3 py-2 border-b flex items-center justify-between ${
        isDark ? "border-white/10" : "border-black/10"
      }`}>
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 ${isDark ? "text-white/60" : "text-black/60"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className={`text-xs font-medium ${
            isDark ? "text-white/80" : "text-black/80"
          }`}>
            Preview: {config.name}
          </span>
        </div>
        <div className={`text-xs ${
          isDark ? "text-white/50" : "text-black/50"
        }`}>
          {config.fontFamily} {config.fontSize}pt
        </div>
      </div>
      
      <div className="p-4 relative min-h-[120px]" style={{ 
        fontFamily: config.fontFamily,
        fontSize: `${fontSizePx}px`,
        lineHeight: config.lineSpacing,
        paddingLeft: `${marginPx}px`,
        paddingRight: `${marginPx}px`,
        paddingTop: `${Math.min(config.margins.top * 96, 24)}px`,
        paddingBottom: `${Math.min(config.margins.bottom * 96, 24)}px`,
        color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
        backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
      }}>
        {/* First line indent visualization */}
        {config.firstLineIndent > 0 && (
          <div
            className={`absolute top-0 bottom-0 w-px ${
              isDark ? "bg-white/20" : "bg-black/20"
            }`}
            style={{
              left: `${marginPx + indentPx}px`,
            }}
            aria-hidden="true"
          />
        )}
        
        {/* Margin guides */}
        <div
          className={`absolute top-0 bottom-0 w-px ${
            isDark ? "bg-white/10" : "bg-black/10"
          }`}
          style={{ left: `${marginPx}px` }}
          aria-hidden="true"
        />
        <div
          className={`absolute top-0 bottom-0 w-px ${
            isDark ? "bg-white/10" : "bg-black/10"
          }`}
          style={{ right: `${marginPx}px` }}
          aria-hidden="true"
        />
        
        {/* Preview text with first line indent */}
        <div
          style={{
            textIndent: `${indentPx}px`,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
        >
          {lines}
        </div>
        
        {/* Formatting info overlay */}
        <div className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-2 text-xs ${
          isDark ? "border-white/10 text-white/50" : "border-black/10 text-black/50"
        }`}>
          <span>Line spacing: {config.lineSpacing === 2.0 ? 'Double' : config.lineSpacing === 1.5 ? '1.5' : 'Single'}</span>
          {config.firstLineIndent > 0 && (
            <span>• First line indent: {config.firstLineIndent}&quot;</span>
          )}
          <span>• Margins: {config.margins.top}&quot; all around</span>
        </div>
      </div>
    </div>
  )
}

