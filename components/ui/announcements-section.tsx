import { prisma } from "@/lib/prisma"

const BADGE_STYLES: Record<string, string> = {
  Feature: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Fix: "bg-green-500/20 text-green-300 border-green-500/30",
  Improvement: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Update: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
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
    return null
  }

  if (announcements.length === 0) return null

  return (
    <section id="updates" className="px-6 py-24 sm:py-32">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="mb-14 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-400 mb-3">
            Changelog
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tighter">
            What&apos;s new
          </h2>
          <p className="mt-3 text-zinc-400 text-base">
            Updates, improvements, and new features.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7.5rem] top-0 bottom-0 w-px bg-white/10 hidden sm:block" />

          <div className="space-y-10">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="sm:flex gap-8 group">
                {/* Date column */}
                <div className="hidden sm:block w-28 shrink-0 pt-0.5 text-right">
                  <span className="text-xs text-zinc-600 tabular-nums">
                    {formatDate(announcement.publishedAt ?? announcement.createdAt)}
                  </span>
                </div>

                {/* Dot */}
                <div className="hidden sm:flex flex-col items-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900 group-hover:bg-violet-500 group-hover:border-violet-900 transition-colors mt-0.5 z-10" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 rounded-xl bg-white/[0.03] border border-white/10 p-5 hover:bg-white/[0.06] hover:border-white/15 transition-colors">
                  {/* Mobile date */}
                  <p className="text-xs text-zinc-600 mb-3 sm:hidden">
                    {formatDate(announcement.publishedAt ?? announcement.createdAt)}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BADGE_STYLES[announcement.badge] ?? BADGE_STYLES.Update}`}
                    >
                      {announcement.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                    {announcement.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
