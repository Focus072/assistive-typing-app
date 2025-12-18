import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { deleteDocument } from "@/lib/google-docs"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { documentId } = await request.json()

    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      )
    }

    await deleteDocument(session.user.id, documentId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "GOOGLE_AUTH_REVOKED") {
      return NextResponse.json(
        { error: "Google authentication required", code: "GOOGLE_AUTH_REVOKED" },
        { status: 401 }
      )
    }

    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting document:", {
        message: error?.message,
        code: error?.code,
      })
    }

    return NextResponse.json(
      {
        error: "Failed to delete document",
        code: error?.code,
      },
      { status: 500 }
    )
  }
}




