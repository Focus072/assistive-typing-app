import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createDocument } from "@/lib/google-docs"
import type { DocumentFormat } from "@/types"
import type { FormatMetadata } from "@/components/FormatMetadataModal"
import type { CustomFormatConfig } from "@/components/CustomFormatModal"

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

    const { title, format, formatMetadata, customFormatConfig } = await request.json()
    
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
      formatMetadata as FormatMetadata | undefined,
      customFormatConfig as CustomFormatConfig | undefined
    )
    
    return NextResponse.json({ documentId })
  } catch (error: unknown) {
    const googleError = error as { message?: string; code?: number }
    if (googleError.message === "GOOGLE_AUTH_REVOKED") {
      return NextResponse.json(
        { error: "Google authentication required", code: "GOOGLE_AUTH_REVOKED" },
        { status: 401 }
      )
    }

    if (process.env.NODE_ENV === "development") {
      console.error("Error creating document:", {
        message: googleError?.message,
        code: googleError?.code,
      })
    }

    // Provide more specific error messages
    let errorMessage = "Failed to create document"
    if (googleError?.code === 401 || googleError?.code === 403) {
      errorMessage = "Google authentication required. Please reconnect your Google account."
    } else if (googleError?.code === 429) {
      errorMessage = "Rate limit exceeded. Please try again in a moment."
    } else if (googleError?.message) {
      errorMessage = googleError.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: googleError?.code,
        details: process.env.NODE_ENV === "development" ? googleError?.message : undefined
      },
      { status: googleError?.code === 401 || googleError?.code === 403 ? 401 : 500 }
    )
  }
}


