import { Inngest } from "inngest"

// For Inngest Cloud, the event key and signing key are configured via environment variables
// INNGEST_EVENT_KEY: Used when sending events via inngest.send()
// INNGEST_SIGNING_KEY: Automatically used by serve() to verify webhook requests
//
// Configuration:
// - For local dev: Set INNGEST_BASE_URL=http://localhost:8288
// - For production: Don't set INNGEST_BASE_URL (or remove it) - Inngest Cloud uses default API endpoint
// - Event key is automatically read from INNGEST_EVENT_KEY env var
const inngestConfig: {
  id: string
  eventKey?: string
  baseURL?: string
} = {
  id: "assistive-typing-app",
}

// Only set eventKey if it exists (for production)
if (process.env.INNGEST_EVENT_KEY) {
  inngestConfig.eventKey = process.env.INNGEST_EVENT_KEY
}

// Only set baseURL for local dev server (localhost)
// For Inngest Cloud, don't set baseURL - it will use the default API endpoint
if (process.env.INNGEST_BASE_URL && process.env.INNGEST_BASE_URL.includes('localhost')) {
  inngestConfig.baseURL = process.env.INNGEST_BASE_URL
}

export const inngest = new Inngest(inngestConfig)


