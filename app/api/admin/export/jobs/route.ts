import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? undefined

    const where = status ? { status } : {}

    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        userId: true,
        documentId: true,
        status: true,
        typingProfile: true,
        totalChars: true,
        currentIndex: true,
        durationMinutes: true,
        createdAt: true,
        completedAt: true,
        errorCode: true,
        dryRun: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const header = "id,userId,userEmail,documentId,status,typingProfile,totalChars,currentIndex,durationMinutes,createdAt,completedAt,errorCode,dryRun"
    const rows = jobs.map(j =>
      `${j.id},${j.userId},${j.user.email},${j.documentId},${j.status},${j.typingProfile},${j.totalChars},${j.currentIndex},${j.durationMinutes},${j.createdAt.toISOString()},${j.completedAt?.toISOString() ?? ""},${j.errorCode ?? ""},${j.dryRun}`
    )

    const csv = [header, ...rows].join("\n")
    const date = new Date().toISOString().split("T")[0]

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="jobs-export-${date}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to export jobs" }, { status: 500 })
  }
}
