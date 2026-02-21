"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  createdAt: string
  updatedAt: string | null
  planTier?: string
  subscriptionStatus?: string | null
  academicIntegrityAcceptedAt?: string | null
  _count: {
    jobs: number
    documents: number
  }
}

const TIER_OPTIONS = ["FREE", "BASIC", "PRO", "UNLIMITED", "ADMIN"] as const

function SetTierButton({
  userId,
  currentTier,
  onUpdated,
}: {
  userId: string
  currentTier: string
  onUpdated: () => void
}) {
  const [loading, setLoading] = useState(false)
  const handleSet = async (tier: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier }),
      })
      if (res.ok) onUpdated()
    } finally {
      setLoading(false)
    }
  }
  return (
    <select
      className="mt-1 text-xs bg-white/10 border border-white/10 rounded px-2 py-1.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
      value={currentTier}
      onChange={(e) => handleSet(e.target.value)}
      disabled={loading}
    >
      {TIER_OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const acceptedOnly = searchParams.get("accepted") === "1"
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login")
      return
    }

    if (status === "authenticated") {
      fetchUsers()
    }
  }, [status, router, pagination.page, acceptedOnly])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      })
      if (acceptedOnly) params.set("accepted", "1")
      const response = await fetch(`/api/admin/users?${params}`)

      if (response.status === 401) {
        setError("Unauthorized: You don't have admin access")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-rose-400 text-xl font-semibold mb-2">Error</div>
          <p className="text-zinc-400 mb-4">{error}</p>
          <Link
            href="/admin"
            className="inline-block px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
          >
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header - sticky */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {acceptedOnly ? "Academic Integrity — Accepted Members" : "User Management"}
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                {acceptedOnly
                  ? `${pagination.total.toLocaleString()} users have accepted the integrity agreement`
                  : `${pagination.total.toLocaleString()} total · Override plan tiers manually`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {acceptedOnly && (
                <Link
                  href="/admin/users"
                  className="flex items-center gap-2 min-h-[44px] px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors touch-manipulation text-sm font-medium"
                >
                  All users
                </Link>
              )}
              <Link
                href="/admin"
                className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-4 py-3 text-violet-400 hover:text-violet-300 hover:bg-white/5 rounded-lg transition-colors touch-manipulation text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile: Card layout */}
        <div className="md:hidden space-y-4">
          {users.length === 0 ? (
            <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6 text-center text-zinc-500">
              No users found
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4"
              >
                <div className="flex items-start gap-4">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-12 h-12 rounded-full shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-violet-500/30 flex items-center justify-center text-violet-400 font-semibold shrink-0">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{user.name || "No name"}</p>
                    <p className="text-sm text-zinc-400 truncate">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-zinc-500">{user._count.jobs} jobs</span>
                      <span className="text-xs text-zinc-500">{user._count.documents} docs</span>
                      <span className="text-xs text-zinc-500">{new Date(user.createdAt).toLocaleDateString()}</span>
                      {acceptedOnly && user.academicIntegrityAcceptedAt && (
                        <span className="text-xs text-emerald-500">
                          Accepted {new Date(user.academicIntegrityAcceptedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-zinc-500 mb-1">Plan: {user.planTier ?? "FREE"}</p>
                      <SetTierButton
                        userId={user.id}
                        currentTier={user.planTier ?? "FREE"}
                        onUpdated={() => fetchUsers()}
                      />
                    </div>
                    <Link
                      href={`/admin/jobs?userId=${user.id}`}
                      className="mt-3 inline-block text-sm text-violet-400 hover:text-violet-300"
                    >
                      View Jobs →
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Jobs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Documents</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Joined</th>
                  {acceptedOnly && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Accepted</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={acceptedOnly ? 8 : 7} className="px-6 py-8 text-center text-zinc-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-violet-500/30 flex items-center justify-center text-violet-400 font-semibold">
                              {(user.name || user.email)[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{user.name || "No name"}</p>
                            <p className="text-xs text-zinc-500">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-zinc-300">{user._count.jobs}</td>
                      <td className="px-6 py-4 text-sm text-zinc-300">{user._count.documents}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white">{user.planTier ?? "FREE"}</p>
                        {user.subscriptionStatus && (
                          <p className="text-xs text-zinc-500">{user.subscriptionStatus}</p>
                        )}
                        <SetTierButton
                          userId={user.id}
                          currentTier={user.planTier ?? "FREE"}
                          onUpdated={() => fetchUsers()}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">{new Date(user.createdAt).toLocaleDateString()}</td>
                      {acceptedOnly && (
                        <td className="px-6 py-4 text-sm text-emerald-400">
                          {user.academicIntegrityAcceptedAt
                            ? new Date(user.academicIntegrityAcceptedAt).toLocaleDateString()
                            : "—"}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/jobs?userId=${user.id}`}
                          className="text-violet-400 hover:text-violet-300 text-sm font-medium"
                        >
                          View Jobs ({user._count.jobs})
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-t border-white/10 sm:px-6">
              <p className="text-sm text-zinc-400">
                Showing <span className="font-medium text-white">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-medium text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                <span className="font-medium text-white">{pagination.total}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile pagination */}
        {pagination.totalPages > 1 && (
          <div className="md:hidden mt-6 flex items-center justify-between">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="min-h-[44px] px-4 py-3 rounded-lg bg-white/10 border border-white/10 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium touch-manipulation"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="min-h-[44px] px-4 py-3 rounded-lg bg-white/10 border border-white/10 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium touch-manipulation"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
