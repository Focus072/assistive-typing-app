"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface AdminStats {
  overview: {
    totalUsers: number
    totalJobs: number
    activeJobs: number
    completedJobs: number
    failedJobs: number
    totalWaitlist: number
    successRate: number
  }
  topUser: {
    id: string
    email: string
    name: string | null
    jobCount: number
  } | null
  recentUsers: Array<{
    id: string
    email: string
    name: string | null
    createdAt: Date
  }>
  recentJobs: Array<{
    id: string
    userId: string
    status: string
    createdAt: Date
    completedAt: Date | null
    totalChars: number
  }>
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect to admin login if not authenticated
    if (status === "unauthenticated") {
      router.push("/admin/login")
      return
    }

    // If authenticated, fetch stats
    if (status === "authenticated") {
      fetchStats()
    }
  }, [status, router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/stats")
      
      if (response.status === 401) {
        setError("Unauthorized: You don't have admin access")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }

      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message || "Failed to load admin dashboard")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-xl font-semibold mb-2">Access Denied</div>
          <p className="text-gray-600 mb-4">{error}</p>
          {status === "unauthenticated" ? (
            <Link
              href="/admin/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Admin Login
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="text-blue-600 hover:underline"
            >
              Try Again
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {session?.user?.email}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats.overview.totalUsers.toLocaleString()}
            icon="👥"
          />
          <StatCard
            title="Total Jobs"
            value={stats.overview.totalJobs.toLocaleString()}
            icon="⚡"
          />
          <StatCard
            title="Active Jobs"
            value={stats.overview.activeJobs.toLocaleString()}
            icon="🟢"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.overview.successRate}%`}
            icon="✅"
          />
          <StatCard
            title="Completed Jobs"
            value={stats.overview.completedJobs.toLocaleString()}
            icon="✔️"
          />
          <StatCard
            title="Failed Jobs"
            value={stats.overview.failedJobs.toLocaleString()}
            icon="❌"
          />
          <StatCard
            title="Waitlist"
            value={stats.overview.totalWaitlist.toLocaleString()}
            icon="📧"
          />
        </div>

        {/* Top User */}
        {stats.topUser && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Most Active User
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                {stats.topUser.email[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {stats.topUser.name || stats.topUser.email}
                </p>
                <p className="text-sm text-gray-600">{stats.topUser.email}</p>
                <p className="text-sm text-gray-500">
                  {stats.topUser.jobCount} jobs total
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.recentUsers.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent users</p>
                ) : (
                  stats.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.name || user.email}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.recentJobs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent jobs</p>
                ) : (
                  stats.recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {job.totalChars.toLocaleString()} chars
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                        {job.completedAt && (
                          <p className="text-xs text-gray-400">
                            Completed {new Date(job.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/users"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900 mb-1">User Management</h3>
              <p className="text-sm text-gray-600">View and manage all users</p>
            </Link>
            <Link
              href="/admin/jobs"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900 mb-1">Job Monitoring</h3>
              <p className="text-sm text-gray-600">Monitor all typing jobs</p>
            </Link>
            <Link
              href="/admin/waitlist"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900 mb-1">Waitlist Management</h3>
              <p className="text-sm text-gray-600">Manage waitlist emails</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}
