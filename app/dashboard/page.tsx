import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardPageClient from "./page-client"

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions)
  
  // Redirect if not authenticated
  if (!session?.user?.id) {
    redirect('/')
  }
  
  // Get search params
  const params = await searchParams
  const checkoutSuccess = params.checkout === 'success'
  
  const planTier = (session.user as { planTier?: string }).planTier
  const role = (session.user as { role?: string | null }).role
  const isAdmin = planTier === "ADMIN" || role === "ADMIN"

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionStatus: true, planTier: true },
  })

  const hasAccess = user?.subscriptionStatus === "active" || user?.planTier === "ADMIN" || isAdmin

  if (!hasAccess) {
    if (checkoutSuccess) {
      return <DashboardPageClient />
    }
    redirect("/#pricing")
  }
  
  return <DashboardPageClient />
}
