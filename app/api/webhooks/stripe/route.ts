import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe as getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 }
    )
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Get user ID from client_reference_id
        const userId = session.client_reference_id
        
        if (!userId) {
          console.error('No client_reference_id in checkout session')
          return NextResponse.json(
            { error: 'No user ID found' },
            { status: 400 }
          )
        }

        // Get subscription details
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string
        
        // Get tier from metadata
        const tier = session.metadata?.tier?.toUpperCase() || 'BASIC'
        
        // Map tier to PlanTier enum
        let planTier: 'FREE' | 'BASIC' | 'PRO' | 'UNLIMITED' = 'BASIC'
        if (tier === 'BASIC') planTier = 'BASIC'
        else if (tier === 'PRO') planTier = 'PRO'
        else if (tier === 'UNLIMITED') planTier = 'UNLIMITED'

        // Update user with subscription details
        await prisma.user.update({
          where: { id: userId },
          data: {
            planTier,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: 'active',
          },
        })

        console.log(`[WEBHOOK] Updated user ${userId} to ${planTier} plan`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const user = await prisma.user.findUnique({
          where: { stripeSubscriptionId: subscription.id },
          select: { id: true, planTier: true },
        })

        if (user && user.planTier !== 'ADMIN') {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              planTier: 'FREE',
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
            },
          })
          console.log(`[WEBHOOK] Reset user ${user.id} to FREE tier`)
        } else if (user?.planTier === 'ADMIN') {
          console.log(`[WEBHOOK] Skipping subscription.deleted for ADMIN user ${user.id}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        const user = await prisma.user.findUnique({
          where: { stripeSubscriptionId: subscription.id },
          select: { id: true, planTier: true },
        })

        if (user && user.planTier !== 'ADMIN') {
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: subscription.status },
          })
          console.log(`[WEBHOOK] Updated subscription status for user ${user.id} to ${subscription.status}`)
        } else if (user?.planTier === 'ADMIN') {
          console.log(`[WEBHOOK] Skipping subscription.updated for ADMIN user ${user.id}`)
        }
        break
      }

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
