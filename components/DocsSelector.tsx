"use client"

import { useEffect, useState } from "react"

interface GoogleDoc {
  id: string
  name: string
  modifiedTime?: string
}

interface DocsSelectorProps {
  value: string
  onChange: (documentId: string) => void
  onCreateNew?: (title: string) => Promise<string>
}

export function DocsSelector({
  value,
  onChange,
  onCreateNew,
}: DocsSelectorProps) {
  const [docs, setDocs] = useState<GoogleDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [showNewDocInput, setShowNewDocInput] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/google-docs/list")
      
      if (!response.ok) {
        const data = await response.json()
        if (data.code === "GOOGLE_AUTH_REVOKED") {
          setError("Please connect your Google account first")
        } else {
          setError("Failed to load documents")
        }
        return
      }

      const data = await response.json()
      setDocs(data.documents || [])
    } catch (err) {
      setError("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newDocTitle.trim() || !onCreateNew) return

    try {
      setCreating(true)
      setError(null)
      const documentId = await onCreateNew(newDocTitle.trim())
      onChange(documentId)
      setShowNewDocInput(false)
      setNewDocTitle("")
      await loadDocuments()
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to create document"
      setError(errorMsg)
      console.error("Failed to create document:", err)
    } finally {
      setCreating(false)
    }
  }

  const selectedDoc = docs.find(d => d.id === value)

  if (loading) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-black flex items-center gap-2">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Google Document
        </label>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 border border-black">
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full animate-spin border-t-black" />
          <span className="text-sm text-gray-600">Loading documents...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-black flex items-center gap-2">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Google Document
        </label>
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm" role="alert">
          {error}
        </div>
        <button
          type="button"
          onClick={loadDocuments}
          className="px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-black flex items-center gap-2">
        <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Google Document
      </label>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-white border border-black text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
            aria-label="Select Google Document"
          >
            <span className={selectedDoc ? 'text-black' : 'text-gray-500'}>
              {selectedDoc?.name || 'Select a document'}
            </span>
            <svg className={`w-4 h-4 text-black transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 py-2 rounded-lg bg-white border border-black shadow-lg max-h-[60vh] overflow-auto">
              {docs.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-600 text-center">
                  No documents found
                </div>
              ) : (
                docs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onChange(doc.id)
                      setIsOpen(false)
                    }}
                    className={`w-full px-3 md:px-4 py-2.5 md:py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2 md:gap-3 touch-manipulation min-h-[44px] ${
                      doc.id === value ? 'bg-black text-white' : 'text-black'
                    }`}
                  >
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      doc.id === value ? 'bg-white text-black' : 'bg-gray-100 text-black'
                    }`}>
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="truncate text-sm md:text-base">{doc.name}</span>
                    {doc.id === value && (
                      <svg className="w-4 h-4 text-white ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        
        {onCreateNew && (
          <button
            type="button"
            onClick={() => setShowNewDocInput(!showNewDocInput)}
            className="px-4 py-3 rounded-lg bg-white border border-black text-black hover:bg-gray-50 transition-colors"
            aria-label="Create new document"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        )}
      </div>
      
      {showNewDocInput && onCreateNew && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New document title"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateNew()
              }
            }}
            className="flex-1 px-4 py-3 rounded-lg bg-white border border-black text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            aria-label="New document title"
          />
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={!newDocTitle.trim() || creating}
            className="px-6 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 rounded-full animate-spin border-t-white" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </button>
        </div>
      )}
      
      {value && (
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Text will be appended to the end of the document
        </p>
      )}
    </div>
  )
}
