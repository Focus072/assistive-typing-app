import { redirect } from "next/navigation"
import { isLocalDevelopment } from "@/lib/page-access"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Safety net: Redirect to home if not in development mode
  // This provides a fail-safe even if individual pages forget their checks
  if (!isLocalDevelopment()) {
    redirect("/")
  }

  return <>{children}</>
}
