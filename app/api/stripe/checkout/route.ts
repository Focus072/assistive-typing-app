import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, STRIPE_PRICE_IDS, type SubscriptionTier } from '@/lib/stripe'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const checkoutSchema = z.object({
  priceId: z.enum(['basic', 'pro', 'unlimited']),
})

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Validate request body
    const body = await request.json()
    const validated = checkoutSchema.parse(body)
    
    // 3. Get the Stripe Price ID for the selected tier
    const priceId = STRIPE_PRICE_IDS[validated.priceId]
    
    if (!priceId || priceId.trim() === '') {
      console.error(`Missing price ID for tier: ${validated.priceId}`, {
        basic: STRIPE_PRICE_IDS.basic,
        pro: STRIPE_PRICE_IDS.pro,
        unlimited: STRIPE_PRICE_IDS.unlimited,
      })
      return NextResponse.json(
        { 
          error: `Price ID not configured for ${validated.priceId} tier. Please check environment variables.`,
          tier: validated.priceId,
        },
        { status: 400 }
      )
    }

    // Log request details for debugging
    console.log('[CHECKOUT] Creating session:', {
      userId: session.user.id,
      email: session.user.email,
      tier: validated.priceId,
      priceId: priceId,
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3002',
    })

    // 4. Set origin with port 3002 fallback
    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3002'

    // 5. Create Stripe Checkout Session
    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        client_reference_id: session.user.id, // Critical: Links payment to Prisma User ID
        customer_email: session.user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/dashboard?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancelled`,
        metadata: {
          userId: session.user.id,
          email: session.user.email,
          tier: validated.priceId,
        },
      })

      // 6. Return checkout URL
      return NextResponse.json({ 
        url: checkoutSession.url 
      })
    } catch (stripeError: any) {
      // Handle Stripe-specific errors
      console.error('[STRIPE ERROR] Checkout session creation failed:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        param: stripeError.param,
        priceId: priceId,
        tier: validated.priceId,
      })
      
      // Return user-friendly error message
      let errorMessage = 'Failed to create checkout session'
      if (stripeError.type === 'StripeInvalidRequestError') {
        if (stripeError.code === 'resource_missing') {
          errorMessage = `Price ID "${priceId}" not found. Please check your Stripe configuration.`
        } else if (stripeError.message) {
          errorMessage = stripeError.message
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          type: stripeError.type,
          code: stripeError.code,
        },
        { status: 400 }
      )
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    // Enhanced error logging
    console.error('Stripe checkout error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Check if it's a Stripe error
    if (typeof error === 'object' && error !== null && 'type' in error) {
      const stripeError = error as any
      console.error('Stripe error type:', stripeError.type)
      console.error('Stripe error code:', stripeError.code)
      console.error('Stripe error message:', stripeError.message)
      console.error('Stripe error details:', JSON.stringify(stripeError, null, 2))
      
      return NextResponse.json(
        { 
          error: stripeError.message || 'Failed to create checkout session',
          type: stripeError.type,
          code: stripeError.code,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    )
  }
}
