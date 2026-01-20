import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  // Always allow galaljobah@gmail.com as admin (independent of env var)
  if (email === "galaljobah@gmail.com") {
    return true
  }
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || []
  return adminEmails.includes(email)
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "100")
    const skip = (page - 1) * limit
    const search = searchParams.get("search") || ""

    const where = search
      ? {
          email: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}

    const [emails, total] = await Promise.all([
      prisma.waitlistEmail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.waitlistEmail.count({ where }),
    ])

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Admin waitlist error:", error)
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
      { status: 500 }
    )
  }
}
