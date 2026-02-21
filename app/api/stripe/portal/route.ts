import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe as getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Billing Portal session so the user can manage
 * subscription (cancel, update payment method, view invoices). Redirects to the portal URL.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe first to manage your subscription.' },
        { status: 400 }
      )
    }

    const origin = new URL(request.url).origin
    const returnUrl = `${origin}/dashboard/account`

    const stripe = getStripe()
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[STRIPE PORTAL] Error:', errMsg)
    return NextResponse.json(
      { error: errMsg || 'Failed to open billing portal' },
      { status: 500 }
    )
  }
}
