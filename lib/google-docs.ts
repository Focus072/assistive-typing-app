import { google } from "googleapis"
import { getGoogleAuthClient } from "./auth"
import { prisma } from "./prisma"
import { hashString } from "./utils"
import type { BatchInsertResult, TypingBatch } from "@/types"

const BATCH_SIZE = 20
const MIN_INTERVAL_MS = 500

export async function getDocsClient(userId: string) {
  const auth = await getGoogleAuthClient(userId)
  return google.docs({ version: "v1", auth })
}

export async function listDocuments(userId: string) {
  try {
    const auth = await getGoogleAuthClient(userId)
    const drive = google.drive({ version: "v3", auth })
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document'",
      fields: "files(id, name, modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 20,
    })

    return response.data.files || []
  } catch (error: any) {
    if (error.code === 401 || error.code === 403) {
      throw new Error("GOOGLE_AUTH_REVOKED")
    }
    throw error
  }
}

export async function createDocument(userId: string, title: string) {
  try {
    const auth = await getGoogleAuthClient(userId)
    const drive = google.drive({ version: "v3", auth })
    
    const response = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: "application/vnd.google-apps.document",
      },
    })

    return response.data.id!
  } catch (error: any) {
    if (error.code === 401 || error.code === 403) {
      throw new Error("GOOGLE_AUTH_REVOKED")
    }
    throw error
  }
}

export async function getDocumentEndIndex(userId: string, documentId: string): Promise<number> {
  try {
    const docs = await getDocsClient(userId)
    const doc = await docs.documents.get({ documentId })
    
    if (!doc.data.body?.content) {
      return 1
    }

    // Find the last index in the document
    const content = doc.data.body.content
    let lastIndex = 1

    for (const element of content) {
      if (element.paragraph) {
        const endIndex = element.endIndex || 0
        if (endIndex > lastIndex) {
          lastIndex = endIndex
        }
      }
    }

    return lastIndex - 1 // Subtract 1 because endIndex is exclusive
  } catch (error: any) {
    if (error.code === 401 || error.code === 403) {
      throw new Error("GOOGLE_AUTH_REVOKED")
    }
    throw error
  }
}

export function createBatch(
  text: string,
  startIndex: number,
  batchSize: number = BATCH_SIZE
): TypingBatch | null {
  if (startIndex >= text.length) {
    return null
  }

  const endIndex = Math.min(startIndex + batchSize, text.length)
  const batchText = text.slice(startIndex, endIndex)
  const hash = hashString(`${batchText}-${startIndex}`)

  return {
    text: batchText,
    startIndex,
    endIndex,
    hash,
  }
}

export async function insertBatch(
  userId: string,
  documentId: string,
  batch: TypingBatch
): Promise<BatchInsertResult> {
  try {
    // Get current document end index (always append at end)
    const insertIndex = await getDocumentEndIndex(userId, documentId)
    
    const docs = await getDocsClient(userId)
    
    const request = {
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: insertIndex,
              },
              text: batch.text,
            },
          },
        ],
      },
    }

    const response = await docs.documents.batchUpdate(request)
    
    // Validate that the revision ID advanced (check for partial failure)
    const revisionId = (response.data as any).revisionId as string | undefined
    if (!revisionId) {
      throw new Error("No revision ID returned")
    }

    return {
      success: true,
      revisionId,
      insertedChars: batch.text.length,
    }
  } catch (error: any) {
    if (error.code === 401 || error.code === 403) {
      return {
        success: false,
        error: "GOOGLE_AUTH_REVOKED",
        insertedChars: 0,
      }
    }
    
    if (error.code === 429) {
      return {
        success: false,
        error: "RATE_LIMIT",
        insertedChars: 0,
      }
    }

    return {
      success: false,
      error: error.message || "Unknown error",
      insertedChars: 0,
    }
  }
}

export async function handleThrottling(
  jobId: string,
  currentDelay: number
): Promise<number> {
  // Exponential backoff for throttling
  const newDelay = Math.min(currentDelay * 2, 10000) // Max 10 seconds
  
  await prisma.job.update({
    where: { id: jobId },
    data: { throttleDelayMs: newDelay },
  })

  await prisma.jobEvent.create({
    data: {
      jobId,
      type: "throttled",
      details: JSON.stringify({ newDelay }),
    },
  })

  return newDelay
}

export async function resetThrottling(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { throttleDelayMs: MIN_INTERVAL_MS },
  })
}


