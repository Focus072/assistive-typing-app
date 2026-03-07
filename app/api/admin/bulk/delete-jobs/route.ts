import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { jobIds } = await req.json()
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "jobIds must be a non-empty array" }, { status: 400 })
    }

    await prisma.jobEvent.deleteMany({ where: { jobId: { in: jobIds } } })
    const result = await prisma.job.deleteMany({ where: { id: { in: jobIds } } })

    await logAudit(session.user.email, "bulk_delete_jobs", { jobIds, deleted: result.count })

    return NextResponse.json({ deleted: result.count })
  } catch {
    return NextResponse.json({ error: "Failed to delete jobs" }, { status: 500 })
  }
}
