"use client"

import { useEffect, useRef } from "react"
import { useDashboardTheme } from "@/app/dashboard/layout"
import { formatConfigs } from "@/lib/document-formats"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { DocumentFormat } from "@/types"
import type { FormatMetadata } from "@/components/FormatMetadataModal"
import type { CustomFormatConfig } from "./CustomFormatModal"

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  text: string
  format: DocumentFormat
  formatMetadata?: FormatMetadata
  customFormatConfig?: CustomFormatConfig
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  text,
  format,
  formatMetadata,
  customFormatConfig,
}: DocumentPreviewModalProps) {
  const { isDark } = useDashboardTheme()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useFocusTrap(isOpen, closeButtonRef) as React.RefObject<HTMLDivElement>
  const config = format === "custom" && customFormatConfig
    ? { ...formatConfigs[format], ...customFormatConfig }
    : formatConfigs[format]

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  // Convert inches to pixels (1 inch = 96px at 100% zoom)
  const marginTopPx = config.margins.top * 96
  const marginBottomPx = config.margins.bottom * 96
  const marginLeftPx = config.margins.left * 96
  const marginRightPx = config.margins.right * 96
  const indentPx = config.firstLineIndent * 96
  const fontSizePx = config.fontSize * 1.33 // Convert pt to px

  // Format header content based on format
  const getHeaderContent = () => {
    if (!formatMetadata) return null

    switch (format) {
      case "mla":
        if (formatMetadata.studentName && formatMetadata.professorName && formatMetadata.courseName && formatMetadata.date) {
          return (
            <div style={{ marginBottom: `${config.lineSpacing * fontSizePx * 2}px` }}>
              <div style={{ textAlign: "left" }}>{formatMetadata.studentName}</div>
              <div style={{ textAlign: "left" }}>{formatMetadata.professorName}</div>
              <div style={{ textAlign: "left" }}>{formatMetadata.courseName}</div>
              <div style={{ textAlign: "left" }}>{formatMetadata.date}</div>
              {formatMetadata.title && (
                <div style={{ marginTop: `${config.lineSpacing * fontSizePx}px`, textAlign: "center" }}>
                  {formatMetadata.title}
                </div>
              )}
            </div>
          )
        }
        break
      case "apa":
        if (formatMetadata.title && formatMetadata.studentName && formatMetadata.institution && formatMetadata.courseName && formatMetadata.professorName && formatMetadata.date) {
          return (
            <div style={{ textAlign: "center", marginBottom: `${config.lineSpacing * fontSizePx * 2}px` }}>
              {formatMetadata.runningHead && (
                <div style={{ fontSize: `${fontSizePx * 0.9}px`, marginBottom: `${config.lineSpacing * fontSizePx * 2}px`, textAlign: "left" }}>
                  Running head: {formatMetadata.runningHead.toUpperCase()}
                </div>
              )}
              <div style={{ fontWeight: "bold", marginBottom: `${config.lineSpacing * fontSizePx}px` }}>
                {formatMetadata.title}
              </div>
              <div>{formatMetadata.studentName}</div>
              <div>{formatMetadata.institution}</div>
              <div>{formatMetadata.courseName}</div>
              <div>{formatMetadata.professorName}</div>
              <div>{formatMetadata.date}</div>
            </div>
          )
        }
        break
      default:
        if (formatMetadata.studentName && formatMetadata.professorName && formatMetadata.courseName && formatMetadata.date) {
          return (
            <div style={{ marginBottom: `${config.lineSpacing * fontSizePx * 2}px` }}>
              <div>{formatMetadata.studentName}</div>
              <div>{formatMetadata.professorName}</div>
              <div>{formatMetadata.courseName}</div>
              <div>{formatMetadata.date}</div>
            </div>
          )
        }
    }
    return null
  }

  const headerContent = getHeaderContent()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
    >
      <div
        ref={modalRef}
        className={`relative w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden ${
          isDark ? "bg-[#1a1a1a]" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark ? "border-white/10" : "border-black/10"
          }`}
        >
          <h2
            id="document-preview-title"
            className={`text-lg font-semibold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Document Preview - {config.name}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? "text-white/70 hover:text-white hover:bg-white/10"
                : "text-black/70 hover:text-black hover:bg-black/5"
            }`}
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Document Preview Container */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-8">
          {/* Document Page */}
          <div
            className={`relative mx-auto shadow-lg ${
              isDark ? "bg-[#fafafa]" : "bg-white"
            }`}
            style={{
              width: "8.5in",
              minHeight: "11in",
              paddingTop: `${marginTopPx}px`,
              paddingBottom: `${marginBottomPx}px`,
              paddingLeft: `${marginLeftPx}px`,
              paddingRight: `${marginRightPx}px`,
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Document Content */}
            <div
              style={{
                fontFamily: config.fontFamily,
                fontSize: `${fontSizePx}px`,
                lineHeight: config.lineSpacing,
                color: "#000000",
                position: "relative",
              }}
            >
              {/* Header Content (Name, Course, etc.) */}
              {headerContent && (
                <div
                  style={{
                    marginBottom: `${config.lineSpacing * fontSizePx * 2}px`,
                  }}
                >
                  {headerContent}
                </div>
              )}

              {/* Main Text Content */}
              <div
                style={{
                  textIndent: `${indentPx}px`,
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                }}
              >
                {text || (
                  <span style={{ color: "#999", fontStyle: "italic" }}>
                    Enter text to see preview...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isDark
              ? "border-white/10 text-white/60"
              : "border-black/10 text-black/60"
          }`}
        >
          <div className="flex items-center gap-4">
            <span>Font: {config.fontFamily} {config.fontSize}pt</span>
            <span>
              Line spacing:{" "}
              {config.lineSpacing === 2.0
                ? "Double"
                : config.lineSpacing === 1.5
                ? "1.5"
                : "Single"}
            </span>
            {config.firstLineIndent > 0 && (
              <span>Indent: {config.firstLineIndent}&quot;</span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-black/5 hover:bg-black/10 text-black"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

