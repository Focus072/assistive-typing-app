import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { academicIntegrityAcceptedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("[LEGAL] accept-academic-integrity error:", error)
    return NextResponse.json(
      { error: "Failed to record acceptance" },
      { status: 500 }
    )
  }
}
