"use client"

import { createContext, useContext } from "react"

export interface DashboardThemeContextType {
  isDark: boolean
  theme: "dark" | "light" | "system"
  setTheme: (theme: "dark" | "light" | "system") => void
}

export const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined)

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext)
  // Return default values when used outside DashboardLayout (e.g., in toast notifications)
  if (!context) {
    // Default to light theme when outside dashboard context
    const isDark = typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
    return {
      isDark,
      theme: "system" as const,
      setTheme: () => {}, // No-op when outside context
    }
  }
  return context
}
