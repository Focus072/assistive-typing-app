import { Inngest } from "inngest"

// Inngest Cloud discovers the endpoint via /api/inngest
// No URL config needed here - Inngest Cloud handles discovery automatically
export const inngest = new Inngest({
  id: "assistive-typing-app",
})


