import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AccountPageClient } from "./account-page-client"

export default async function DashboardAccountPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/")
  }
  return <AccountPageClient />
}
