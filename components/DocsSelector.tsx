"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus } from "lucide-react"

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
      const documentId = await onCreateNew(newDocTitle.trim())
      onChange(documentId)
      setShowNewDocInput(false)
      setNewDocTitle("")
      await loadDocuments()
    } catch (err) {
      setError("Failed to create document")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Google Document</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Google Document</Label>
        <div className="text-sm text-destructive" role="alert">
          {error}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadDocuments}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="document-select">Google Document</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="document-select" aria-label="Select Google Document">
            <SelectValue placeholder="Select a document or create new" />
          </SelectTrigger>
          <SelectContent>
            {docs.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                {doc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowNewDocInput(!showNewDocInput)}
            aria-label="Create new document"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {showNewDocInput && onCreateNew && (
        <div className="flex gap-2">
          <Input
            placeholder="New document title"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateNew()
              }
            }}
            aria-label="New document title"
          />
          <Button
            type="button"
            onClick={handleCreateNew}
            disabled={!newDocTitle.trim() || creating}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      )}
      {value && (
        <p className="text-xs text-muted-foreground">
          Note: Text will be appended to the end of the document. Editing the
          document while typing is running may cause unexpected behavior.
        </p>
      )}
    </div>
  )
}


