import { Inngest } from "inngest"

// For Inngest Cloud, the event key and signing key are configured via environment variables
// INNGEST_EVENT_KEY: Used when sending events via inngest.send()
// INNGEST_SIGNING_KEY: Automatically used by serve() to verify webhook requests
export const inngest = new Inngest({ id: "assistive-typing-app" })


