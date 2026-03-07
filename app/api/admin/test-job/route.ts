import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/inngest/client"

export const dynamic = "force-dynamic"

const VALID_PROFILES = ["steady", "fatigue", "burst", "micropause", "typing-test"]

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { textContent, durationMinutes, typingProfile, testWPM } = body

    if (!textContent || typeof textContent !== "string" || textContent.length < 1 || textContent.length > 50000) {
      return NextResponse.json({ error: "textContent must be 1-50000 characters" }, { status: 400 })
    }
    if (!durationMinutes || durationMinutes < 1 || durationMinutes > 360) {
      return NextResponse.json({ error: "durationMinutes must be 1-360" }, { status: 400 })
    }
    if (!typingProfile || !VALID_PROFILES.includes(typingProfile)) {
      return NextResponse.json({ error: `Invalid typingProfile. Valid: ${VALID_PROFILES.join(", ")}` }, { status: 400 })
    }
    if (typingProfile === "typing-test" && (!testWPM || testWPM < 1 || testWPM > 300)) {
      return NextResponse.json({ error: "testWPM must be 1-300 for typing-test profile" }, { status: 400 })
    }

    const job = await prisma.job.create({
      data: {
        userId: session.user.id!,
        documentId: "dry-run",
        textContent,
        totalChars: textContent.length,
        currentIndex: 0,
        durationMinutes,
        typingProfile,
        testWPM: typingProfile === "typing-test" ? testWPM : null,
        status: "running",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        dryRun: true,
      },
    })

    await prisma.jobEvent.create({
      data: { jobId: job.id, type: "started", details: JSON.stringify({ dryRun: true }) },
    })

    try {
      await inngest.send({ name: "job/batch", data: { jobId: job.id } })
    } catch {
      // Log but don't fail — Inngest may not be running locally
      await prisma.jobEvent.create({
        data: { jobId: job.id, type: "start_dispatch_failed", details: "Inngest send failed" },
      })
    }

    return NextResponse.json({ jobId: job.id })
  } catch {
    return NextResponse.json({ error: "Failed to create test job" }, { status: 500 })
  }
}
