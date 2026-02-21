import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

const KEYS = ["maintenance_mode", "FREE_MAX_JOBS_PER_DAY", "FREE_MAX_JOB_HISTORY"] as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.setting.findMany({
      where: { key: { in: [...KEYS] } },
    })
    const map: Record<string, string | null> = {}
    for (const k of KEYS) {
      map[k] = settings.find((s) => s.key === k)?.value ?? null
    }
    return NextResponse.json(map)
  } catch (error: unknown) {
    console.error("[ADMIN SETTINGS GET]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    for (const key of KEYS) {
      if (key in body && (body[key] === null || typeof body[key] === "string" || typeof body[key] === "number")) {
        const value = body[key] == null ? null : String(body[key])
        await prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      }
    }

    const settings = await prisma.setting.findMany({
      where: { key: { in: [...KEYS] } },
    })
    const map: Record<string, string | null> = {}
    for (const k of KEYS) {
      map[k] = settings.find((s) => s.key === k)?.value ?? null
    }
    return NextResponse.json(map)
  } catch (error: unknown) {
    console.error("[ADMIN SETTINGS PATCH]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    )
  }
}
