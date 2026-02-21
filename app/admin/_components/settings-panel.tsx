"use client"

import { motion } from "framer-motion"
import { Settings, Scale } from "lucide-react"
import Link from "next/link"

interface AdminSettings {
  maintenance_mode: string | null
  FREE_MAX_JOBS_PER_DAY: string | null
  FREE_MAX_JOB_HISTORY: string | null
}

interface SettingsPanelProps {
  settings: AdminSettings
  settingsSaving: boolean
  academicIntegrityCount: number
  totalUsers: number
  onPatch: (updates: Partial<AdminSettings>) => void
  onSettingsChange: (updated: AdminSettings) => void
}

export function SettingsPanel({
  settings,
  settingsSaving,
  academicIntegrityCount,
  totalUsers,
  onPatch,
  onSettingsChange,
}: SettingsPanelProps) {
  return (
    <>
      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6 mb-6 sm:mb-8"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-zinc-400" />
          Settings
        </h2>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm font-medium text-zinc-300">Maintenance mode</span>
            <button
              type="button"
              onClick={() => onPatch({ maintenance_mode: settings.maintenance_mode === "true" ? "false" : "true" })}
              disabled={settingsSaving}
              className={`
                relative w-16 h-10 rounded-full border-2 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-950
                disabled:opacity-50 disabled:cursor-not-allowed
                ${settings.maintenance_mode === "true"
                  ? "bg-violet-600 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                  : "bg-zinc-800 border-zinc-600 hover:border-zinc-500"
                }
              `}
            >
              <span
                className={`
                  absolute top-1 w-7 h-7 rounded-full bg-white shadow-lg transition-transform duration-200
                  ${settings.maintenance_mode === "true" ? "left-8" : "left-1"}
                `}
              />
            </button>
            <span className="text-sm text-zinc-500">{settings.maintenance_mode === "true" ? "On" : "Off"}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Free tier limits (overrides)</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Max jobs per day</label>
                <input
                  type="number"
                  min={0}
                  value={settings.FREE_MAX_JOBS_PER_DAY ?? ""}
                  onChange={(e) => onSettingsChange({ ...settings, FREE_MAX_JOBS_PER_DAY: e.target.value || null })}
                  onBlur={(e) => onPatch({ FREE_MAX_JOBS_PER_DAY: e.target.value ? String(e.target.value) : null })}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-24 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Max job history</label>
                <input
                  type="number"
                  min={0}
                  value={settings.FREE_MAX_JOB_HISTORY ?? ""}
                  onChange={(e) => onSettingsChange({ ...settings, FREE_MAX_JOB_HISTORY: e.target.value || null })}
                  onBlur={(e) => onPatch({ FREE_MAX_JOB_HISTORY: e.target.value ? String(e.target.value) : null })}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-24 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="10"
                />
              </div>
              <span className="text-xs text-zinc-500">Leave empty for defaults. Save on blur.</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Legal Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6 mb-6 sm:mb-8"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-zinc-400" />
          Legal Settings
        </h2>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm font-medium text-zinc-300">Academic integrity accepted</span>
            <span className="text-xl font-bold text-violet-400">{academicIntegrityCount.toLocaleString()}</span>
            <span className="text-sm text-zinc-500">of {totalUsers.toLocaleString()} users</span>
          </div>
          <p className="text-xs text-zinc-500">
            Users must accept the academic integrity acknowledgment before accessing the tool.
          </p>
          <Link
            href="/admin/users?accepted=1"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            View accepted members →
          </Link>
        </div>
      </motion.div>
    </>
  )
}
