"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { useDashboardTheme } from "@/app/dashboard/layout"

interface Command {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
  shortcut?: string
  category: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onStartJob?: () => void
  onPauseJob?: () => void
  onResumeJob?: () => void
  onStopJob?: () => void
  hasActiveJob?: boolean
  jobStatus?: string
}

export function CommandPalette({
  isOpen,
  onClose,
  onStartJob,
  onPauseJob,
  onResumeJob,
  onStopJob,
  hasActiveJob,
  jobStatus,
}: CommandPaletteProps) {
  const router = useRouter()
  const toast = useToast()
  const { isDark } = useDashboardTheme()
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands: Command[] = [
    {
      id: "new-job",
      label: "Start New Job",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: () => {
        onStartJob?.()
        onClose()
      },
      shortcut: "Ctrl+Enter",
      category: "Actions",
    },
    ...(hasActiveJob && jobStatus === "running"
      ? [
          {
            id: "pause",
            label: "Pause Job",
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ),
            action: () => {
              onPauseJob?.()
              onClose()
            },
            shortcut: "Space",
            category: "Actions",
          } as Command,
        ]
      : []),
    ...(hasActiveJob && jobStatus === "paused"
      ? [
          {
            id: "resume",
            label: "Resume Job",
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            ),
            action: () => {
              onResumeJob?.()
              onClose()
            },
            shortcut: "Space",
            category: "Actions",
          } as Command,
        ]
      : []),
    ...(hasActiveJob
      ? [
          {
            id: "stop",
            label: "Stop Job",
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            ),
            action: () => {
              onStopJob?.()
              onClose()
            },
            shortcut: "Esc",
            category: "Actions",
          } as Command,
        ]
      : []),
    {
      id: "history",
      label: "View Job History",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => {
        router.push("/dashboard/history")
        onClose()
      },
      category: "Navigation",
    },
    {
      id: "settings",
      label: "Open Settings",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: () => {
        router.push("/dashboard/settings")
        onClose()
      },
      category: "Navigation",
    },
    {
      id: "analytics",
      label: "View Analytics",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      action: () => {
        router.push("/dashboard/analytics")
        onClose()
      },
      category: "Navigation",
    },
  ]

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  )

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = []
    }
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, Command[]>)

  useEffect(() => {
    if (isOpen) {
      setSearch("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 ${
        isDark ? "bg-black/50" : "bg-black/30"
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 border ${
          isDark
            ? "bg-[#111] border-white/20"
            : "bg-white border-black/20"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-4 border-b ${
          isDark ? "border-white/10" : "border-black/10"
        }`}>
          <div className="flex items-center gap-3">
            <svg className={`w-5 h-5 ${
              isDark ? "text-white/50" : "text-gray-500"
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedIndex(0)
              }}
              className={`flex-1 bg-transparent border-0 focus:outline-none text-lg ${
                isDark
                  ? "text-white placeholder:text-white/40"
                  : "text-black placeholder:text-gray-400"
              }`}
              autoFocus
            />
            <kbd className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${
              isDark
                ? "bg-white/10 border-white/20 text-white/80"
                : "bg-gray-100 border-black/20 text-black"
            }`}>
              Esc
            </kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category}>
              <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-white/60" : "text-gray-600"
              }`}>
                {category}
              </div>
              {cmds.map((cmd, idx) => {
                const globalIndex = filteredCommands.indexOf(cmd)
                const isSelected = globalIndex === selectedIndex
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? isDark
                          ? "bg-white text-black"
                          : "bg-black text-white"
                        : isDark
                        ? "text-white hover:bg-white/5"
                        : "text-black hover:bg-gray-50"
                    }`}
                  >
                    <div className={`flex-shrink-0 ${
                      isSelected
                        ? isDark ? "text-black" : "text-white"
                        : isDark ? "text-white" : "text-black"
                    }`}>
                      {cmd.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{cmd.label}</div>
                    </div>
                    {cmd.shortcut && (
                      <kbd className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                        isDark
                          ? "bg-white/10 border-white/20 text-white/80"
                          : "bg-gray-100 border-black/20 text-black"
                      }`}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className={`p-8 text-center ${
              isDark ? "text-white/60" : "text-gray-600"
            }`}>
              <p>No commands found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

