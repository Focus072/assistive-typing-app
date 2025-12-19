import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// Stable params unwrapping helper - forward-compatible with Next.js param handling changes
async function unwrapParams<T>(params: Promise<T> | T): Promise<T> {
  return Promise.resolve(params)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await unwrapParams(params)

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    if (job.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    return NextResponse.json({ job })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
    console.error("Error fetching job:", error)
    }
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    )
  }
}


