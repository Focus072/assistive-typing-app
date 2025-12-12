import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { typingJob, typingBatch } from "@/inngest/functions/typing-job"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [typingJob, typingBatch],
})

