import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createDocument } from "@/lib/google-docs"
import type { DocumentFormat } from "@/types"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { title, format } = await request.json()
    
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const documentId = await createDocument(
      session.user.id, 
      title,
      format as DocumentFormat | undefined
    )
    
    return NextResponse.json({ documentId })
  } catch (error: any) {
    if (error.message === "GOOGLE_AUTH_REVOKED") {
      return NextResponse.json(
        { error: "Google authentication required", code: "GOOGLE_AUTH_REVOKED" },
        { status: 401 }
      )
    }
    
    console.error("Error creating document:", error)
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    )
  }
}


