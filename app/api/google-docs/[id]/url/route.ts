import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDocumentWebViewLink } from "@/lib/google-drive"

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

    const webViewLink = await getDocumentWebViewLink(session.user.id, id)

    return NextResponse.json({ url: webViewLink })
  } catch (error: any) {
    if (error.message === "GOOGLE_AUTH_REVOKED") {
      return NextResponse.json(
        { error: "Google authentication required" },
        { status: 401 }
      )
    }
    if (error.message === "DOCUMENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching document URL:", error)
    }
    return NextResponse.json(
      { error: "Failed to fetch document URL" },
      { status: 500 }
    )
  }
}

