import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/admin")
  }
  if (!isAdminEmail(session.user.email)) {
    redirect("/")
  }
  return <>{children}</>
}
