import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"
import { logger } from "@/lib/logger"
import { PlanTier } from "@prisma/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  planTier: z.enum(["FREE", "BASIC", "PRO", "UNLIMITED", "ADMIN"]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { planTier } = bodySchema.parse(body)

    const updateData: { planTier: PlanTier; subscriptionStatus?: string } = {
      planTier: planTier as PlanTier,
    }
    if (planTier === "ADMIN") {
      updateData.subscriptionStatus = "active"
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        planTier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    })
    logger.log(`[ADMIN] Admin ${session.user.email} changed User ${userId} to tier ${planTier}`)
    return NextResponse.json(user)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid planTier" }, { status: 400 })
    }
    logger.error("[ADMIN] Tier update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update tier" },
      { status: 500 }
    )
  }
}
