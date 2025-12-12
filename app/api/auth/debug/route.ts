import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Check database connection
    const userCount = await prisma.user.count().catch(() => -1)
    const accountCount = await prisma.account.count().catch(() => -1)
    
    return NextResponse.json({
      session: session ? { id: session.user?.id, email: session.user?.email } : null,
      database: {
        connected: userCount >= 0,
        userCount,
        accountCount,
      },
      env: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}




