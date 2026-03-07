"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, UserCog, ClipboardList, FlaskConical,
  BarChart3, Megaphone, ScrollText, Activity, ChevronLeft,
  ChevronRight, Menu, X, Home,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, color: "text-violet-400" },
  { href: "/admin/users", label: "Users", Icon: UserCog, color: "text-cyan-400" },
  { href: "/admin/jobs", label: "Jobs", Icon: ClipboardList, color: "text-emerald-400" },
  { href: "/admin/testing", label: "Testing", Icon: FlaskConical, color: "text-amber-400" },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3, color: "text-emerald-400" },
  { href: "/admin/announcements", label: "Announce", Icon: Megaphone, color: "text-violet-400" },
  { href: "/admin/audit", label: "Audit Log", Icon: ScrollText, color: "text-cyan-400" },
  { href: "/admin/diagnostics", label: "Diagnostics", Icon: Activity, color: "text-rose-400" },
] as const

// Custom event name for opening the sidebar from any page header
export const SIDEBAR_OPEN_EVENT = "admin-sidebar-open"

/** Hamburger button to embed in each page's sticky header (mobile only) */
export function MobileMenuButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(SIDEBAR_OPEN_EVENT))}
      className="md:hidden flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Listen for open event from page headers
  const handleOpenEvent = useCallback(() => {
    setMobileOpen(true)
  }, [])

  useEffect(() => {
    window.addEventListener(SIDEBAR_OPEN_EVENT, handleOpenEvent)
    return () => window.removeEventListener(SIDEBAR_OPEN_EVENT, handleOpenEvent)
  }, [handleOpenEvent])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const navContent = (isMobile: boolean) => (
    <>
      {/* Logo area */}
      <div className="flex items-center justify-between h-14 border-b border-white/10 shrink-0 px-4">
        {(isMobile || !collapsed) ? (
          <span className="text-sm font-bold text-white tracking-wide">TypeFlow Admin</span>
        ) : (
          <span className="text-lg font-bold text-violet-400 mx-auto">TF</span>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, Icon, color }) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={!isMobile && collapsed ? label : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
                isActive
                  ? "bg-violet-600/20 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-violet-400" : color}`} />
              {(isMobile || !collapsed) && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
              {/* Tooltip on hover when collapsed (desktop only) */}
              {!isMobile && collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-zinc-800 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-[70]">
                  {label}
                </span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-violet-400 rounded-r" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Back to App link (mobile only) */}
      {isMobile && (
        <div className="px-2 pb-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px]"
          >
            <Home className="w-5 h-5 shrink-0 text-violet-400" />
            <span className="text-sm font-medium">Back to App</span>
          </Link>
        </div>
      )}

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}
    </>
  )

  return (
    <>
      {/* No fixed hamburger button — each page's sticky header includes its own */}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[59] bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <aside
        className={`fixed left-0 top-0 z-[60] h-full bg-zinc-950 border-r border-white/10 flex flex-col transition-transform duration-200 md:hidden w-64 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 z-[60] h-full bg-zinc-950 border-r border-white/10 flex-col transition-all duration-200 ${
          collapsed ? "w-16" : "w-52"
        }`}
      >
        {navContent(false)}
      </aside>
    </>
  )
}
