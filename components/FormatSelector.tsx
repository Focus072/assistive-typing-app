"use client"

import { useState } from "react"
import type { DocumentFormat } from "@/types"
import { formatConfigs } from "@/lib/document-formats"
import { FormatMetadataModal, type FormatMetadata } from "./FormatMetadataModal"

interface FormatSelectorProps {
  value: DocumentFormat
  onChange: (format: DocumentFormat, metadata?: FormatMetadata) => void
  formatMetadata?: FormatMetadata
}

export function FormatSelector({ value, onChange, formatMetadata }: FormatSelectorProps) {
  const formats: DocumentFormat[] = ["none", "mla"]
  const [showModal, setShowModal] = useState(false)
  const [pendingFormat, setPendingFormat] = useState<DocumentFormat | null>(null)

  const handleFormatClick = (format: DocumentFormat) => {
    if (format === "none") {
      onChange(format)
      return
    }

    // Always show modal for formats that require metadata
    // This allows users to:
    // 1. Fill metadata when first selecting a format
    // 2. Edit metadata by clicking the format again
    // 3. Provide metadata when switching formats
    setPendingFormat(format)
    setShowModal(true)
  }

  const handleMetadataSave = (metadata: FormatMetadata) => {
    if (pendingFormat) {
      onChange(pendingFormat, metadata)
      setPendingFormat(null)
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-black flex items-center gap-2">
        <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Document Format
      </label>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {formats.map((format) => {
          const config = formatConfigs[format]
          const isSelected = value === format
          
          return (
            <button
              key={format}
              onClick={() => handleFormatClick(format)}
              className={`relative p-3 md:p-4 rounded-lg text-left transition-all group touch-manipulation active:scale-95 ${
                isSelected
                  ? 'bg-black border-black border-2'
                  : 'bg-white border border-black hover:bg-gray-50 active:bg-gray-100'
              }`}
              aria-label={`Select ${config.name} format`}
              aria-pressed={isSelected}
              tabIndex={0}
            >
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg mb-2 flex items-center justify-center ${
                isSelected 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-black group-hover:text-gray-900'
              }`}>
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className={`font-medium text-xs md:text-sm ${isSelected ? 'text-white' : 'text-black'}`}>
                {config.name}
              </div>
              <div className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600'} hidden sm:block mt-0.5`}>
                {config.description}
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {value !== "none" && (
        <div className="px-3 py-2 rounded-lg bg-gray-100 border border-black">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-black">
              <strong>{formatConfigs[value].name}:</strong> {formatConfigs[value].description}
            </p>
            {formatMetadata && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">
                ✓ Configured
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-700 space-y-0.5">
            <p>• Font: {formatConfigs[value].fontFamily}, {formatConfigs[value].fontSize}pt</p>
            <p>• Line spacing: {formatConfigs[value].lineSpacing === 2.0 ? "Double" : formatConfigs[value].lineSpacing === 1.5 ? "1.5" : "Single"}</p>
            <p>• Margins: {formatConfigs[value].margins.top}" all around</p>
            {formatConfigs[value].firstLineIndent > 0 && (
              <p>• First line indent: {formatConfigs[value].firstLineIndent}"</p>
            )}
            {formatMetadata && (
              <p className="text-green-700 mt-1 pt-1 border-t border-gray-300">
                • Header: {formatMetadata.studentName}, {formatMetadata.courseName}
              </p>
            )}
          </div>
        </div>
      )}

      <FormatMetadataModal
        isOpen={showModal}
        format={pendingFormat || value}
        onClose={() => {
          setShowModal(false)
          setPendingFormat(null)
        }}
        onSave={handleMetadataSave}
        initialMetadata={formatMetadata}
      />
    </div>
  )
}

