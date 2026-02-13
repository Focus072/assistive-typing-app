import { redirect } from "next/navigation"
import { isLocalDevelopment } from "@/lib/page-access"

export default function HomePage() {
  // In production, redirect to waitlist
  // In local development, allow access to all pages
  if (!isLocalDevelopment()) {
    redirect("/waitlist")
  }
  
  // In local dev, show a simple page or redirect to dashboard
  redirect("/dashboard")
}
