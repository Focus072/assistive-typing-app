import { prisma } from "@/lib/prisma"

const BADGE_STYLES: Record<string, string> = {
  Feature: "bg-purple-100 text-purple-700 border-purple-200",
  Fix: "bg-green-100 text-green-700 border-green-200",
  Improvement: "bg-blue-100 text-blue-700 border-blue-200",
  Update: "bg-gray-100 text-gray-600 border-gray-200",
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export async function AnnouncementsSection() {
  let announcements: Awaited<ReturnType<typeof prisma.announcement.findMany>> = []
  try {
    announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
    })
  } catch {
    return <div id="updates" />
  }

  if (announcements.length === 0) return <div id="updates" />

  return (
    <section id="updates" className="relative space-y-8 py-16 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-3 tracking-tight">
            What&apos;s new
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Updates, improvements, and new features.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative max-w-2xl mx-auto">
          {/* Vertical connector line */}
          <div className="absolute left-[7.5rem] top-2 bottom-2 w-px bg-border hidden sm:block" />

          <div className="space-y-8">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="sm:flex gap-6 group">
                {/* Date column */}
                <div className="hidden sm:block w-28 shrink-0 pt-1 text-right">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(announcement.publishedAt ?? announcement.createdAt)}
                  </span>
                </div>

                {/* Dot */}
                <div className="hidden sm:flex flex-col items-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-border border-2 border-background group-hover:bg-primary group-hover:border-primary/20 transition-colors mt-1.5 z-10" />
                </div>

                {/* Content card */}
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

                  <h3 className="text-base font-semibold mb-1">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {announcement.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom separator matching other sections */}
        <div className="h-px w-full shrink-0 bg-gray-200/90 mt-12" aria-hidden="true" />
      </div>
    </section>
  )
}
