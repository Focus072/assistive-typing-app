"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Megaphone, Plus, Trash2, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface Announcement {
  id: string
  title: string
  content: string
  badge: string
  published: boolean
  publishedAt: string | null
  createdAt: string
}

const BADGE_OPTIONS = ["Update", "Feature", "Fix", "Improvement"]

const BADGE_COLORS: Record<string, string> = {
  Feature: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Fix: "bg-green-500/20 text-green-300 border-green-500/30",
  Improvement: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Update: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [badge, setBadge] = useState("Update")
  const [showForm, setShowForm] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAnnouncements(data)
    } catch {
      setError("Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), badge }),
      })
      if (!res.ok) throw new Error("Failed to create")
      setTitle("")
      setContent("")
      setBadge("Update")
      setShowForm(false)
      await fetchAnnouncements()
    } catch {
      setError("Failed to create announcement")
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish(announcement: Announcement) {
    try {
      const res = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !announcement.published }),
      })
      if (!res.ok) throw new Error("Failed to update")
      await fetchAnnouncements()
    } catch {
      setError("Failed to update announcement")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchAnnouncements()
    } catch {
      setError("Failed to delete announcement")
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link
            href="/admin"
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Admin
          </Link>
          <span className="text-zinc-700">/</span>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-semibold text-white">Announcements</h1>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Create button / form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6"
        >
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New announcement
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <h2 className="text-sm font-semibold text-white mb-4">New Announcement</h2>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's new?"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">Badge</label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  {BADGE_OPTIONS.map((b) => (
                    <option key={b} value={b} className="bg-zinc-900">
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe the update..."
                  required
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Announcements list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
              <Megaphone className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No announcements yet. Create your first one above.</p>
            </div>
          ) : (
            announcements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BADGE_COLORS[a.badge] ?? BADGE_COLORS.Update}`}
                      >
                        {a.badge}
                      </span>
                      {a.published ? (
                        <span className="text-xs text-green-400 font-medium">Live</span>
                      ) : (
                        <span className="text-xs text-zinc-500">Draft</span>
                      )}
                      <span className="text-xs text-zinc-600">
                        {a.published && a.publishedAt
                          ? `Published ${formatDate(a.publishedAt)}`
                          : `Created ${formatDate(a.createdAt)}`}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 truncate">{a.title}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2">{a.content}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTogglePublish(a)}
                      title={a.published ? "Unpublish" : "Publish"}
                      className={`p-2 rounded-lg border transition-all ${
                        a.published
                          ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                          : "bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {a.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      title="Delete"
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}
