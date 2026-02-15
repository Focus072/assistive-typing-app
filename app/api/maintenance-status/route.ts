import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: "maintenance_mode" },
    })
    const maintenance = row?.value === "true"
    return NextResponse.json(
      { maintenance },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    )
  } catch {
    return NextResponse.json({ maintenance: false })
  }
}
