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
  
  // Check subscription status from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionStatus: true },
  })
  
  // Grace period: If checkout=success, allow 30 seconds for webhook to process
  // Otherwise, redirect to pricing if subscription is not active
  if (user?.subscriptionStatus !== 'active') {
    if (checkoutSuccess) {
      // Allow grace period - pass through to client component which will handle polling
      return <DashboardPageClient />
      } else {
      // No grace period, redirect immediately
      redirect('/#pricing')
    }
  }
  
  return <DashboardPageClient />
}
