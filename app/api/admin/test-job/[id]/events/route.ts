import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentIndex: true,
        totalChars: true,
        typingProfile: true,
        durationMinutes: true,
        testWPM: true,
        dryRun: true,
        createdAt: true,
        completedAt: true,
        errorCode: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (!job.dryRun) {
      return NextResponse.json({ error: "Not a dry-run job" }, { status: 403 })
    }

    const events = await prisma.jobEvent.findMany({
      where: { jobId: id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ job, events })
  } catch {
    return NextResponse.json({ error: "Failed to fetch test job events" }, { status: 500 })
  }
}
