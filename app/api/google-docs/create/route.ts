import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createDocument } from "@/lib/google-docs"
import type { DocumentFormat } from "@/types"
import type { FormatMetadata } from "@/components/FormatMetadataModal"

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

    const { title, format, formatMetadata } = await request.json()
    
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const documentId = await createDocument(
      session.user.id, 
      title,
      format as DocumentFormat | undefined,
      formatMetadata as FormatMetadata | undefined
    )
    
    return NextResponse.json({ documentId })
  } catch (error: any) {
    if (error.message === "GOOGLE_AUTH_REVOKED") {
      return NextResponse.json(
        { error: "Google authentication required", code: "GOOGLE_AUTH_REVOKED" },
        { status: 401 }
      )
    }
    
    console.error("Error creating document:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      response: error?.response?.data,
    })
    
    // Provide more specific error messages
    let errorMessage = "Failed to create document"
    if (error?.code === 401 || error?.code === 403) {
      errorMessage = "Google authentication required. Please reconnect your Google account."
    } else if (error?.code === 429) {
      errorMessage = "Rate limit exceeded. Please try again in a moment."
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: error?.code,
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: error?.code === 401 || error?.code === 403 ? 401 : 500 }
    )
  }
}


