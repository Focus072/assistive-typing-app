import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        planTier: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: { select: { jobs: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const header = "id,email,name,planTier,subscriptionStatus,createdAt,jobCount,documentCount"
    const rows = users.map(u => {
      const name = (u.name ?? "").replace(/,/g, " ")
      return `${u.id},${u.email},${name},${u.planTier},${u.subscriptionStatus ?? ""},${u.createdAt.toISOString()},${u._count.jobs},${u._count.documents}`
    })

    const csv = [header, ...rows].join("\n")
    const date = new Date().toISOString().split("T")[0]

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${date}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 })
  }
}
