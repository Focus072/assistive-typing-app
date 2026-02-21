import { google } from "googleapis"
import { getGoogleAuthClient } from "./auth"

/**
 * Get the webViewLink for a Google Doc using the Drive API.
 * This link is permission-aware and works with OAuth authentication.
 * 
 * @param userId - The user ID to authenticate the request
 * @param documentId - The Google Doc document ID
 * @returns The webViewLink URL for the document
 * @throws Error if authentication fails or document is not found
 */
export async function getDocumentWebViewLink(
  userId: string,
  documentId: string
): Promise<string> {
  try {
    const auth = await getGoogleAuthClient(userId)
    const drive = google.drive({ version: "v3", auth })
    
    const response = await drive.files.get({
      fileId: documentId,
      fields: "webViewLink",
    })

    if (!response.data.webViewLink) {
      throw new Error("webViewLink not found for document")
    }

    return response.data.webViewLink
  } catch (error: unknown) {
    const googleError = error as { message?: string; code?: number }
    // Handle missing Google token
    if (googleError.message === "Google OAuth token not found" || googleError.message?.includes("Google OAuth token")) {
      throw new Error("GOOGLE_AUTH_REVOKED")
    }
    // Handle Google API auth errors
    if (googleError.code === 401 || googleError.code === 403) {
      throw new Error("GOOGLE_AUTH_REVOKED")
    }
    // Handle not found
    if (googleError.code === 404) {
      throw new Error("DOCUMENT_NOT_FOUND")
    }
    throw error
  }
}

