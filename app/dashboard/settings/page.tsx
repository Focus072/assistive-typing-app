"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"

export default function SettingsPage() {
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
    toast.addToast("Theme updated", "success")
  }

  const handleSoundChange = (enabled: boolean) => {
    setSoundEffects(enabled)
    localStorage.setItem("soundEffects", enabled.toString())
    toast.addToast(enabled ? "Sound effects enabled" : "Sound effects disabled", "info")
  }

  const handleNotificationsChange = (enabled: boolean) => {
    setNotifications(enabled)
    localStorage.setItem("notifications", enabled.toString())
    toast.addToast(enabled ? "Notifications enabled" : "Notifications disabled", "info")
  }

  const handleMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled)
    localStorage.setItem("reducedMotion", enabled.toString())
    document.documentElement.classList.toggle("reduce-motion", enabled)
    toast.addToast(enabled ? "Reduced motion enabled" : "Reduced motion disabled", "info")
  }

  const handleContrastChange = (enabled: boolean) => {
    setHighContrast(enabled)
    localStorage.setItem("highContrast", enabled.toString())
    document.documentElement.classList.toggle("high-contrast", enabled)
    toast.addToast(enabled ? "High contrast enabled" : "High contrast disabled", "info")
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-black">
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-gray-600 mt-2">Customize your TypeFlow experience</p>
      </div>

      {/* Appearance */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          Appearance
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {(["dark", "light", "system"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => handleThemeChange(option)}
                  className={`p-4 rounded-lg border transition-all ${
                    theme === option
                      ? "bg-black border-black text-white"
                      : "bg-white border-black text-black hover:bg-gray-50"
                  }`}
                >
                  <div className="capitalize font-medium mb-1">{option}</div>
                  <div className="text-xs text-gray-600">
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
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          Keyboard Shortcuts
        </h2>

        <div className="space-y-3">
          <ShortcutItem keys={["⌘", "K"]} description="Open command palette" />
          <ShortcutItem keys={["Ctrl", "Enter"]} description="Start new job" />
          <ShortcutItem keys={["Space"]} description="Pause/Resume job" />
          <ShortcutItem keys={["Esc"]} description="Stop job / Close dialogs" />
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
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="font-medium text-black">{label}</div>
        <div className="text-sm text-gray-600 mt-1">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-14 h-8 rounded-full transition-colors ${
          enabled ? "bg-black" : "bg-gray-200"
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <div
          className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

function ShortcutItem({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-black">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, idx) => (
          <span key={idx}>
            <kbd className="px-2 py-1 rounded bg-gray-100 border border-black text-xs text-black font-mono">
              {key}
            </kbd>
            {idx < keys.length - 1 && <span className="text-gray-600 mx-1">+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

