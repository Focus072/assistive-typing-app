"use client"

import { useState, useEffect } from "react"
import { logger } from "@/lib/logger"

export function useDocumentManager(documentId: string) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loadingDocumentUrl, setLoadingDocumentUrl] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  useEffect(() => {
    if (!documentId) {
      const id = setTimeout(() => {
        setDocumentUrl(null)
        setIframeError(false)
      }, 0)
      return () => clearTimeout(id)
    }

    let cancelled = false
    const syncId = setTimeout(() => {
      if (!cancelled) {
        setLoadingDocumentUrl(true)
        setIframeError(false)
      }
    }, 0)

    const fetchDocumentUrl = async () => {
      try {
        const response = await fetch(`/api/google-docs/${documentId}/url`)
        if (!response.ok) {
          throw new Error("Failed to fetch document URL")
        }
        const data = await response.json()
        if (!cancelled) {
          setDocumentUrl(data.url)
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Error fetching document URL:", error)
          setDocumentUrl(`https://docs.google.com/document/d/${documentId}/edit`)
        }
      } finally {
        if (!cancelled) {
          setLoadingDocumentUrl(false)
        }
      }
    }

    void fetchDocumentUrl()

    return () => {
      cancelled = true
      clearTimeout(syncId)
    }
  }, [documentId])

  return {
    documentUrl,
    loadingDocumentUrl,
    iframeError,
    setIframeError,
  }
}
