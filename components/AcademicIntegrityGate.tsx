"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

interface AcademicIntegrityGateProps {
  children: React.ReactNode
}

export function AcademicIntegrityGate({ children }: AcademicIntegrityGateProps) {
  const { data: session, status, update: updateSession } = useSession()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPersistedAcceptance =
    (session?.user as { academicIntegrityAcceptedAt?: Date | null })
      ?.academicIntegrityAcceptedAt != null

  if (status === "loading" || !session) {
    return null
  }

  if (hasPersistedAcceptance) {
    return <>{children}</>
  }

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!accepted) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/legal/accept-academic-integrity", {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to record acceptance")
      }
      await updateSession()
      setAccepted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="max-w-md w-full rounded-2xl border border-white/20 bg-zinc-900 p-6 sm:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-white mb-3">
          Academic Integrity Acknowledgment
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          Before using this tool, you must confirm that you understand your
          responsibilities.
        </p>
        <label className="flex items-start gap-3 cursor-pointer group mb-6 select-none">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 shrink-0 rounded border-2 border-white/40 bg-white/10 checked:bg-violet-600 checked:border-violet-500 text-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 cursor-pointer"
          />
          <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
            I understand that I am responsible for following my school&apos;s
            academic integrity rules.
          </span>
        </label>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full py-3 px-4 rounded-lg font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            {loading ? "Saving..." : "I Accept"}
          </button>
          <p className="text-xs text-zinc-500 text-center">
            By accepting, you agree to our{" "}
            <Link href="/terms" className="text-violet-400 hover:text-violet-300 underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        {error && (
          <p className="mt-4 text-sm text-rose-400 text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
