export type TypingProfile = "steady" | "fatigue" | "burst" | "micropause"

export type JobStatus = 
  | "pending" 
  | "running" 
  | "paused" 
  | "completed" 
  | "failed" 
  | "stopped" 
  | "expired"

export interface Job {
  id: string
  userId: string
  documentId: string
  textContent: string
  totalChars: number
  currentIndex: number
  durationMinutes: number
  typingProfile: TypingProfile
  status: JobStatus
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
  expiresAt: Date
  inngestEventId?: string | null
  lastBatchHash?: string | null
  throttleDelayMs: number
  errorCode?: string | null
}

export interface JobEvent {
  id: string
  jobId: string
  type: string
  details?: string | null
  createdAt: Date
}

export interface BatchInsertResult {
  success: boolean
  revisionId?: string
  error?: string
  insertedChars: number
}

export interface TypingBatch {
  text: string
  startIndex: number
  endIndex: number
  hash: string
}


