"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  maxChars?: number
}

export function TextInput({ value, onChange, maxChars = 50000 }: TextInputProps) {
  const charCount = value.length
  const isNearLimit = charCount > maxChars * 0.9

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxChars) {
      onChange(newValue)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="text-input">Text to Type</Label>
        <span
          className={`text-sm ${
            isNearLimit ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {charCount.toLocaleString()} / {maxChars.toLocaleString()} characters
        </span>
      </div>
      <Textarea
        id="text-input"
        value={value}
        onChange={handleChange}
        placeholder="Paste or type the text you want to be typed into Google Docs..."
        className="min-h-[200px] font-mono text-sm"
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


