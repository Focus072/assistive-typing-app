// Suppress deprecation warnings early
import "@/lib/suppress-warnings"

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { listDocuments } from "@/lib/google-docs"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const documents = await listDocuments(session.user.id)
    
    return NextResponse.json({ documents })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "GOOGLE_AUTH_REVOKED") {
      return NextResponse.json(
        { error: "Google authentication required", code: "GOOGLE_AUTH_REVOKED" },
        { status: 401 }
      )
    }
    
    if (process.env.NODE_ENV === "development") {
      logger.error("Error listing documents:", error)
    }
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    )
  }
}


