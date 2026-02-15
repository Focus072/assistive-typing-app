"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import { useDashboardTheme } from "../theme-context"

export default function SettingsPage() {
  const { isDark } = useDashboardTheme()
  const toast = useToast()
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark")
  const [soundEffects, setSoundEffects] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    // Load saved preferences
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | "system" | null
    if (savedTheme) setTheme(savedTheme)
    
    const savedSound = localStorage.getItem("soundEffects")
    if (savedSound !== null) setSoundEffects(savedSound === "true")
    
    const savedNotifications = localStorage.getItem("notifications")
    if (savedNotifications !== null) setNotifications(savedNotifications === "true")
    
    const savedMotion = localStorage.getItem("reducedMotion")
    if (savedMotion !== null) setReducedMotion(savedMotion === "true")
    
    const savedContrast = localStorage.getItem("highContrast")
    if (savedContrast !== null) setHighContrast(savedContrast === "true")
  }, [])

  const handleThemeChange = (newTheme: "dark" | "light" | "system") => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    // No toast - visual change is immediate feedback
  }

  const handleSoundChange = (enabled: boolean) => {
    setSoundEffects(enabled)
    localStorage.setItem("soundEffects", enabled.toString())
    // No toast - setting change is immediate
  }

  const handleNotificationsChange = (enabled: boolean) => {
    setNotifications(enabled)
    localStorage.setItem("notifications", enabled.toString())
    // No toast - setting change is immediate
  }

  const handleMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled)
    localStorage.setItem("reducedMotion", enabled.toString())
    document.documentElement.classList.toggle("reduce-motion", enabled)
    // No toast - setting change is immediate
  }

  const handleContrastChange = (enabled: boolean) => {
    setHighContrast(enabled)
    localStorage.setItem("highContrast", enabled.toString())
    document.documentElement.classList.toggle("high-contrast", enabled)
    // No toast - setting change is immediate
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className={`flex items-center gap-2 transition-colors ${
            isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className={`text-3xl md:text-4xl font-bold ${
          isDark ? "text-white" : "text-black"
        }`}>
          Settings
        </h1>
        <p className={`mt-2 ${
          isDark ? "text-white/60" : "text-black/60"
        }`}>Customize your typingisboring experience</p>
      </div>

      {/* Appearance */}
      <div className={`rounded-xl p-6 border ${
        isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
      }`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center gap-3 ${
          isDark ? "text-white" : "text-black"
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDark ? "bg-white/10 text-white" : "bg-black text-white"
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          Appearance
        </h2>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDark ? "text-white" : "text-black"
            }`}>Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {(["dark", "light", "system"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => handleThemeChange(option)}
                  className={`p-4 rounded-lg border transition-all ${
                    theme === option
                      ? isDark
                        ? "bg-white border-white text-black"
                        : "bg-black border-black text-white"
                      : isDark
                      ? "bg-white/5 border-white/20 text-white hover:bg-white/10"
                      : "bg-white border-black/20 text-black hover:bg-gray-50"
                  }`}
                  aria-pressed={theme === option}
                  aria-label={`Set theme to ${option}`}
                >
                  <div className="capitalize font-medium mb-1">{option}</div>
                  <div className={`text-xs ${
                    isDark ? "text-white/60" : "text-black/60"
                  }`}>
                    {option === "system" ? "Follow system" : `${option} mode`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <SettingToggle
            label="High Contrast Mode"
            description="Increase contrast for better visibility"
            enabled={highContrast}
            onChange={handleContrastChange}
          />

          <SettingToggle
            label="Reduced Motion"
            description="Disable animations for accessibility"
            enabled={reducedMotion}
            onChange={handleMotionChange}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className={`rounded-xl p-6 border ${
        isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
      }`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center gap-3 ${
          isDark ? "text-white" : "text-black"
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDark ? "bg-white/10 text-white" : "bg-black text-white"
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          Notifications
        </h2>

        <div className="space-y-4">
          <SettingToggle
            label="Enable Notifications"
            description="Receive notifications for job updates"
            enabled={notifications}
            onChange={handleNotificationsChange}
          />
        </div>
      </div>

      {/* Sound */}
      <div className={`rounded-xl p-6 border ${
        isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
      }`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center gap-3 ${
          isDark ? "text-white" : "text-black"
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDark ? "bg-white/10 text-white" : "bg-black text-white"
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          Sound Effects
        </h2>

        <div className="space-y-4">
          <SettingToggle
            label="Enable Sound Effects"
            description="Play sounds for job completion and actions"
            enabled={soundEffects}
            onChange={handleSoundChange}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className={`rounded-xl p-6 border ${
        isDark ? "bg-[#101010] border-[#333]" : "bg-white border-black/10"
      }`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center gap-3 ${
          isDark ? "text-white" : "text-black"
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDark ? "bg-white/10 text-white" : "bg-black text-white"
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          Keyboard Shortcuts
        </h2>

        <div className="space-y-3">
          <ShortcutItem keys={["⌘", "K"]} description="Open command palette" isDark={isDark} />
          <ShortcutItem keys={["Ctrl", "Enter"]} description="Start new job" isDark={isDark} />
          <ShortcutItem keys={["Space"]} description="Pause/Resume job" isDark={isDark} />
          <ShortcutItem keys={["Esc"]} description="Stop job / Close dialogs" isDark={isDark} />
        </div>
      </div>
    </div>
  )
}

function SettingToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const { isDark } = useDashboardTheme()
  
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className={`font-medium ${
          isDark ? "text-white" : "text-black"
        }`}>{label}</div>
        <div className={`text-sm mt-1 ${
          isDark ? "text-white/60" : "text-black/60"
        }`}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-14 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          enabled
            ? isDark ? "bg-white" : "bg-black"
            : isDark ? "bg-white/20" : "bg-gray-200"
        } ${isDark ? "focus:ring-white" : "focus:ring-black"}`}
        role="switch"
        aria-checked={enabled}
        aria-label={`${label}: ${enabled ? "enabled" : "disabled"}`}
      >
        <div
          className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-transform ${
            enabled
              ? isDark ? "bg-black translate-x-6" : "bg-white translate-x-6"
              : "bg-white translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

function ShortcutItem({ keys, description, isDark }: { keys: string[]; description: string; isDark: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={isDark ? "text-white" : "text-black"}>{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, idx) => (
          <span key={idx}>
            <kbd className={`px-2 py-1 rounded border text-xs font-mono ${
              isDark
                ? "bg-white/10 border-white/20 text-white"
                : "bg-gray-100 border-black/20 text-black"
            }`}>
              {key}
            </kbd>
            {idx < keys.length - 1 && <span className={`mx-1 ${
              isDark ? "text-white/60" : "text-black/60"
            }`}>+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

