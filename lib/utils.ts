import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hashString(str: string): string {
  // Simple hash function for batch idempotency
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export function calculateTimeRemaining(
  totalChars: number,
  currentIndex: number,
  durationMinutes: number
): number {
  if (currentIndex >= totalChars) return 0
  const progress = currentIndex / totalChars
  const elapsed = durationMinutes * progress
  return Math.max(0, durationMinutes - elapsed)
}


