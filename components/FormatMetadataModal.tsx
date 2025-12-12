"use client"

import { useState, useEffect, useRef } from "react"
import type { DocumentFormat } from "@/types"

export interface FormatMetadata {
  studentName: string
  professorName: string
  courseName: string
  date: string
  title?: string // For APA title page
  institution?: string // For APA affiliation/institution
  runningHead?: string // For APA running head
}

interface FormatMetadataModalProps {
  isOpen: boolean
  format: DocumentFormat
  onClose: () => void
  onSave: (metadata: FormatMetadata) => void
  initialMetadata?: Partial<FormatMetadata>
}

const formatFields: Record<DocumentFormat, Array<keyof FormatMetadata>> = {
  none: [],
  mla: ["studentName", "professorName", "courseName", "date"],
  apa: ["title", "studentName", "institution", "courseName", "professorName", "date", "runningHead"],
  chicago: ["studentName", "professorName", "courseName", "date"],
  harvard: ["studentName", "professorName", "courseName", "date"],
  ieee: ["studentName", "professorName", "courseName", "date"],
  custom: ["studentName", "professorName", "courseName", "date"],
}

const fieldLabels: Record<keyof FormatMetadata, string> = {
  studentName: "Your Name",
  professorName: "Professor Name",
  courseName: "Course/Subject",
  date: "Date",
  title: "Paper Title",
  institution: "Institution/Affiliation",
  runningHead: "Running Head (short title)",
}

export function FormatMetadataModal({
  isOpen,
  format,
  onClose,
  onSave,
  initialMetadata = {},
}: FormatMetadataModalProps) {
  const [metadata, setMetadata] = useState<FormatMetadata>({
    studentName: initialMetadata.studentName || "",
    professorName: initialMetadata.professorName || "",
    courseName: initialMetadata.courseName || "",
    date: initialMetadata.date || new Date().toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    }),
    title: initialMetadata.title || "",
    institution: initialMetadata.institution || "",
    runningHead: initialMetadata.runningHead || "",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormatMetadata, string>>>({})
  const prevIsOpenRef = useRef(false)

  useEffect(() => {
    // Only reset when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      // Reset to initial values when modal opens
      const defaultDate = new Date().toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
      
      setMetadata({
        studentName: initialMetadata?.studentName || "",
        professorName: initialMetadata?.professorName || "",
        courseName: initialMetadata?.courseName || "",
        date: initialMetadata?.date || defaultDate,
        title: initialMetadata?.title || "",
        institution: initialMetadata?.institution || "",
        runningHead: initialMetadata?.runningHead || "",
      })
      setErrors({})
    }
    prevIsOpenRef.current = isOpen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // Only depend on isOpen to avoid infinite loops

  if (!isOpen) return null

  const requiredFields = formatFields[format]
  const hasRequiredFields = requiredFields.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const newErrors: Partial<Record<keyof FormatMetadata, string>> = {}
    requiredFields.forEach((field) => {
      if (!metadata[field] || metadata[field]!.trim() === "") {
        newErrors[field] = `${fieldLabels[field]} is required`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(metadata)
    onClose()
  }

  const handleChange = (field: keyof FormatMetadata, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!hasRequiredFields) {
    // No fields needed, just close
    onClose()
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border-2 border-black rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-black">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">
              {format.toUpperCase()} Format Details
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Please fill in the required information for your document header
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {requiredFields.map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-black mb-1.5">
                {fieldLabels[field]}
                <span className="text-red-600 ml-1">*</span>
              </label>
              {field === "date" ? (
                <input
                  type="text"
                  value={metadata[field] || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  placeholder="e.g., 11 December 2025"
                  className={`w-full px-4 py-2.5 rounded-lg border-2 ${
                    errors[field] ? "border-red-500" : "border-black"
                  } text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black`}
                  required
                />
              ) : field === "runningHead" ? (
                <div>
                  <input
                    type="text"
                    value={metadata[field] || ""}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder="e.g., POLLUTION IN THE ARCTIC"
                    className={`w-full px-4 py-2.5 rounded-lg border-2 ${
                      errors[field] ? "border-red-500" : "border-black"
                    } text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Short version of your title (max 50 characters, will appear in header)
                  </p>
                </div>
              ) : (
                <input
                  type="text"
                  value={metadata[field] || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  placeholder={`Enter ${fieldLabels[field].toLowerCase()}`}
                  className={`w-full px-4 py-2.5 rounded-lg border-2 ${
                    errors[field] ? "border-red-500" : "border-black"
                  } text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black`}
                  required
                />
              )}
              {errors[field] && (
                <p className="text-xs text-red-600 mt-1">{errors[field]}</p>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white border-2 border-black text-black font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-900 transition-colors"
            >
              Save & Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

