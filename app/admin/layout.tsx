import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { AdminSidebar } from "./_components/admin-sidebar"

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
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <AdminSidebar />
      {/* No left margin on mobile (sidebar is an overlay), ml-16 on desktop */}
      <div className="flex-1 md:ml-16 min-w-0">{children}</div>
    </div>
  )
}
