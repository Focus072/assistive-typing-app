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
  } catch (error: any) {
    // Handle missing Google token
    if (error.message === "Google OAuth token not found" || error.message?.includes("Google OAuth token")) {
      throw new Error("GOOGLE_AUTH_REVOKED")
    }
    // Handle Google API auth errors
    if (error.code === 401 || error.code === 403) {
      throw new Error("GOOGLE_AUTH_REVOKED")
    }
    // Handle not found
    if (error.code === 404) {
      throw new Error("DOCUMENT_NOT_FOUND")
    }
    throw error
  }
}

