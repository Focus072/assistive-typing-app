import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Default: only "steady" visible for all tiers when no admin override is set
const DEFAULT_VISIBLE: Record<string, string[]> = {
  FREE: ["steady"],
  BASIC: ["steady"],
  PRO: ["steady"],
  UNLIMITED: ["steady"],
  ADMIN: ["steady"],
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const tier = (session?.user as { planTier?: string } | undefined)?.planTier ?? "FREE"

    const setting = await prisma.setting.findUnique({
      where: { key: "enabled_profiles" },
    })

    if (!setting?.value) {
      return NextResponse.json(DEFAULT_VISIBLE[tier] ?? ["steady"])
    }

    const parsed = JSON.parse(setting.value) as Record<string, string[]>
    const visible = parsed[tier] ?? ["steady"]
    return NextResponse.json(visible)
  } catch {
    return NextResponse.json(["steady"])
  }
}
