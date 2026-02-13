"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { PlanTier } from "@prisma/client"

interface NavLink {
  name: string
  href: string
}

interface MobileNavProps {
  currentPath?: string
  links: NavLink[]
  mobileLinks?: NavLink[]
}

export function MobileNav({ currentPath, links, mobileLinks }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session } = useSession()
  const userTier: PlanTier = session?.user?.planTier || "FREE"

  // Use mobileLinks if provided, otherwise use links
  const displayMobileLinks = mobileLinks || links

  // Tier badge styling
  const getTierBadge = (tier: PlanTier) => {
    if (tier === "FREE") return null
    const badges = {
      BASIC: { text: "BASIC", className: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
      PRO: { text: "PRO", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
      UNLIMITED: { text: "UNLIMITED", className: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
    }
    return badges[tier]
  }

  const tierBadge = getTierBadge(userTier)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo - Left side */}
        <div className="flex items-center gap-1.5">
          <Link 
            href="/" 
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
            aria-label="Home"
          >
            <span className="text-xl font-bold text-white">N</span>
          </Link>
          {tierBadge && (
            <span className={`px-2 py-0.5 text-[9px] font-semibold rounded border flex-shrink-0 ${tierBadge.className}`}>
              {tierBadge.text}
            </span>
          )}
        </div>

        {/* Desktop Navigation - Center */}
        <nav className="hidden sm:flex items-center justify-center gap-6 flex-1">
          {links.map((link, index) => {
            const isActive = currentPath === link.href || (currentPath === "/" && link.href === "/")
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Mobile Burger Menu - Right side */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <div className="flex flex-col gap-1.5">
            <span
              className={`block w-5 h-0.5 bg-white transition-all ${
                isMenuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-5 h-0.5 bg-white transition-all ${
                isMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-5 h-0.5 bg-white transition-all ${
                isMenuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-16 left-0 right-0 bg-black/95 backdrop-blur-md border-b border-white/10 z-40 sm:hidden">
            <nav className="flex flex-col px-6 py-4 gap-1">
              {displayMobileLinks.map((link) => {
                const isActive = currentPath === link.href || (currentPath === "/" && link.href === "/")
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg transition-colors font-medium ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {link.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
