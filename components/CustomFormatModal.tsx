"use client"

import { useState, useEffect, useRef } from "react"
import { useDashboardTheme } from "@/app/dashboard/layout"
import { useFocusTrap } from "@/hooks/useFocusTrap"

export interface CustomFormatConfig {
  fontFamily: string
  fontSize: number
  lineSpacing: number
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  firstLineIndent: number
}

interface CustomFormatModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: CustomFormatConfig) => void
  initialConfig?: CustomFormatConfig
}

const fontOptions = [
  "Times New Roman",
  "Arial",
  "Calibri",
  "Georgia",
  "Verdana",
  "Courier New",
  "Helvetica",
  "Garamond",
]

const lineSpacingOptions = [
  { value: 1.0, label: "Single" },
  { value: 1.15, label: "1.15" },
  { value: 1.5, label: "1.5" },
  { value: 2.0, label: "Double" },
  { value: 2.5, label: "2.5" },
  { value: 3.0, label: "3.0" },
]

const defaultConfig: CustomFormatConfig = {
  fontFamily: "Times New Roman",
  fontSize: 12,
  lineSpacing: 2.0,
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  firstLineIndent: 0.5,
}

export function CustomFormatModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: CustomFormatModalProps) {
  const { isDark } = useDashboardTheme()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useFocusTrap(isOpen, closeButtonRef) as React.RefObject<HTMLDivElement>
  
  const [config, setConfig] = useState<CustomFormatConfig>(
    initialConfig || defaultConfig
  )

  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig(initialConfig)
    }
  }, [isOpen, initialConfig])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(config)
    onClose()
  }

  const updateMargin = (side: keyof CustomFormatConfig["margins"], value: number) => {
    setConfig((prev) => ({
      ...prev,
      margins: {
        ...prev.margins,
        [side]: Math.max(0, Math.min(3, value)), // Clamp between 0 and 3 inches
      },
    }))
  }

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
      aria-labelledby="custom-format-title"
    >
      <div
        ref={modalRef}
        className={`relative w-full max-w-2xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden ${
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
            id="custom-format-title"
            className={`text-lg font-semibold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Custom Format Settings
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? "text-white/70 hover:text-white hover:bg-white/10"
                : "text-black/70 hover:text-black hover:bg-black/5"
            }`}
            aria-label="Close"
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

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          <div className="space-y-6">
            {/* Font Family */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Font Family
              </label>
              <select
                value={config.fontFamily}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, fontFamily: e.target.value }))
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark
                    ? "bg-[#0a0a0a] border-white/20 text-white"
                    : "bg-white border-black/20 text-black"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                {fontOptions.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Font Size: {config.fontSize}pt
              </label>
              <input
                type="range"
                min="8"
                max="24"
                step="1"
                value={config.fontSize}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, fontSize: parseInt(e.target.value) }))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>8pt</span>
                <span>24pt</span>
              </div>
            </div>

            {/* Line Spacing */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Line Spacing
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {lineSpacingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, lineSpacing: option.value }))
                    }
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      config.lineSpacing === option.value
                        ? isDark
                          ? "bg-white text-black border-white"
                          : "bg-black text-white border-black"
                        : isDark
                        ? "bg-[#0a0a0a] border-white/20 text-white hover:bg-white/10"
                        : "bg-white border-black/20 text-black hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Margins (inches)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <div key={side}>
                    <label
                      className={`block text-xs mb-1 capitalize ${
                        isDark ? "text-white/70" : "text-black/70"
                      }`}
                    >
                      {side}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="3"
                      step="0.1"
                      value={config.margins[side]}
                      onChange={(e) =>
                        updateMargin(side, parseFloat(e.target.value) || 0)
                      }
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark
                          ? "bg-[#0a0a0a] border-white/20 text-white"
                          : "bg-white border-black/20 text-black"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* First Line Indent */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                First Line Indent: {config.firstLineIndent}&quot;
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.firstLineIndent}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    firstLineIndent: parseFloat(e.target.value),
                  }))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0&quot;</span>
                <span>2&quot;</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`flex gap-3 pt-6 mt-6 border-t ${
              isDark ? "border-white/10" : "border-black/10"
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors ${
                isDark
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  : "bg-black/5 border-black/20 text-black hover:bg-black/10"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2.5 rounded-lg transition-colors ${
                isDark
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-black text-white hover:bg-black/90"
              }`}
            >
              Save & Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

