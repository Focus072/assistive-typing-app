import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Header } from "@/components/ui/header-1"
import { Footer } from "@/components/ui/footer"

export const metadata: Metadata = {
  title: "Updates – Typing Is Boring",
  description: "The latest updates, improvements, and new features for Typing Is Boring.",
}

const BADGE_STYLES: Record<string, string> = {
  Feature: "bg-purple-100 text-purple-700 border-purple-200",
  Fix: "bg-green-100 text-green-700 border-green-200",
  Improvement: "bg-blue-100 text-blue-700 border-blue-200",
  Update: "bg-gray-100 text-gray-600 border-gray-200",
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default async function UpdatesPage() {
  let announcements: Awaited<ReturnType<typeof prisma.announcement.findMany>> = []
  try {
    announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
    })
  } catch {
    announcements = []
  }

  return (
    <div className="flex w-full flex-col min-h-screen">
      <Header />
      <main className="grow px-4 py-16">
        <div className="mx-auto max-w-2xl">
          {/* Page header */}
          <div className="mb-14">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
              What&apos;s new
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Updates, improvements, and new features.
            </p>
          </div>

          {/* Timeline */}
          {announcements.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
              <p className="text-muted-foreground text-sm">No updates yet. Check back soon.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[7.5rem] top-2 bottom-2 w-px bg-border hidden sm:block" />

              <div className="space-y-8">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="sm:flex gap-6 group">
                    {/* Date */}
                    <div className="hidden sm:block w-28 shrink-0 pt-1 text-right">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(announcement.publishedAt ?? announcement.createdAt)}
                      </span>
                    </div>

                    {/* Dot */}
                    <div className="hidden sm:flex flex-col items-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-border border-2 border-background group-hover:bg-primary group-hover:border-primary/20 transition-colors mt-1.5 z-10" />
                    </div>

                    {/* Card */}
                    <div className="flex-1 min-w-0 rounded-xl border border-border bg-muted/30 p-5 hover:bg-muted/50 transition-colors">
                      {/* Mobile date */}
                      <p className="text-xs text-muted-foreground mb-2 sm:hidden">
                        {formatDate(announcement.publishedAt ?? announcement.createdAt)}
                      </p>

                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BADGE_STYLES[announcement.badge] ?? BADGE_STYLES.Update}`}
                        >
                          {announcement.badge}
                        </span>
                      </div>

                      <h2 className="text-base font-semibold mb-1">
                        {announcement.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
