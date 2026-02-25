import type { TypingProfile } from "@/types"

export function scoreWPM(wpm: number): { score: number; label: string; colorClass: "green" | "amber" | "red" } {
  if (wpm < 20) return { score: 5, label: "Impossibly slow", colorClass: "red" }
  if (wpm < 40) return { score: Math.round(10 + ((wpm - 20) / 20) * 30), label: "Suspiciously slow", colorClass: "amber" }
  if (wpm <= 75) return { score: Math.round(75 + ((wpm - 40) / 35) * 25), label: "Human-like", colorClass: "green" }
  if (wpm <= 100) return { score: Math.round(75 - ((wpm - 75) / 25) * 25), label: "Fast — plausible", colorClass: "amber" }
  return { score: Math.max(5, Math.round(20 - ((wpm - 100) / 50) * 15)), label: "Suspiciously fast", colorClass: "red" }
}

export function computeHumanScore(
  wpm: number,
  wordCount: number,
  durationMinutes: number,
  profile: TypingProfile,
): number {
  const wpmScore = scoreWPM(wpm).score

  // Sanity ratio: too few or too many words for the time window
  const wordsPerMinute = wordCount / Math.max(1, durationMinutes)
  let ratioScore = 100
  if (wordsPerMinute < 4) ratioScore = 30
  else if (wordsPerMinute > 150) ratioScore = 10

  // Profile appropriateness for the text length
  let profileScore = 85
  if (profile === "fatigue" && wordCount > 300) profileScore = 95
  else if (profile === "micropause") profileScore = 80
  else if (profile === "typing-test") profileScore = 70

  return Math.min(100, Math.round(wpmScore * 0.6 + ratioScore * 0.2 + profileScore * 0.2))
}
