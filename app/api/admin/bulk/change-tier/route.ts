import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

const VALID_TIERS = ["FREE", "BASIC", "PRO", "UNLIMITED", "ADMIN"]

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userIds, planTier } = await req.json()
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds must be a non-empty array" }, { status: 400 })
    }
    if (!VALID_TIERS.includes(planTier)) {
      return NextResponse.json({ error: `Invalid planTier. Valid: ${VALID_TIERS.join(", ")}` }, { status: 400 })
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { planTier: planTier as "FREE" | "BASIC" | "PRO" | "UNLIMITED" | "ADMIN" },
    })

    await logAudit(session.user.email, "bulk_change_tier", { userIds, planTier, updated: result.count })

    return NextResponse.json({ updated: result.count })
  } catch {
    return NextResponse.json({ error: "Failed to change tier" }, { status: 500 })
  }
}
