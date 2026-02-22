import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AiChatClient } from "./page-client"

export const metadata: Metadata = {
  title: "AI Writing Assistant – typingisboring",
}

export default async function AiChatPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/")
  if (session.user.planTier !== "UNLIMITED") redirect("/dashboard?error=upgrade-required")
  return <AiChatClient />
}
