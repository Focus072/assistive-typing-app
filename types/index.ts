export type TypingProfile = "steady" | "fatigue" | "burst" | "micropause"

export type JobStatus = "pending" | "running" | "paused" | "completed" | "failed" | "stopped" | "expired"

export type DocumentFormat = "none" | "mla" | "apa" | "chicago" | "harvard" | "ieee" | "custom"

export interface TypingBatch {
  text: string
  startIndex: number
  endIndex: number
  hash: string
}

export interface BatchInsertResult {
  success: boolean
  revisionId?: string
  error?: string
  insertedChars: number
}
