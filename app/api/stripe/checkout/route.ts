import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe as getStripe, STRIPE_PRICE_IDS, type SubscriptionTier } from '@/lib/stripe'
import { z } from 'zod'
import type { Session } from 'next-auth'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const checkoutSchema = z.object({
  priceId: z.enum(['basic', 'pro', 'unlimited']),
})

// Shared checkout logic for both GET and POST. Pass requestOrigin from request.url so redirect URLs are always valid.
async function createCheckoutSession(
  tier: 'basic' | 'pro' | 'unlimited',
  session: Session,
  requestOrigin: string
) {
  // Get the Stripe Price ID for the selected tier
  const priceId = STRIPE_PRICE_IDS[tier]

  if (!priceId || priceId.trim() === '') {
    console.error(`Missing price ID for tier: ${tier}`, {
      basic: STRIPE_PRICE_IDS.basic,
      pro: STRIPE_PRICE_IDS.pro,
      unlimited: STRIPE_PRICE_IDS.unlimited,
    })
    throw new Error(`Price ID not configured for ${tier} tier. Please check environment variables.`)
  }

  // Use request origin so success/cancel URLs are always valid (no dependency on NEXTAUTH_URL)
  const origin = requestOrigin.replace(/\/+$/, '')
  const successUrl = `${origin}/dashboard?checkout=success`
  const cancelUrl = `${origin}/`

  console.log('[CHECKOUT] Creating session:', {
    userId: session.user.id,
    email: session.user.email,
    tier,
    priceId,
    successUrl,
    cancelUrl,
  })

  // Create Stripe Checkout Session
  const stripe = getStripe()
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    client_reference_id: session.user.id, // Critical: Links payment to Prisma User ID
    customer_email: session.user.email ?? undefined,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: session.user.id,
      email: session.user.email ?? null,
      tier: tier,
    },
  })

  return checkoutSession
}

// GET handler for deep link checkout (after authentication redirect)
export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.email) {
      // Redirect to Google OAuth sign-in if not authenticated
      const url = new URL(request.url)
      const priceId = url.searchParams.get('priceId')
      const signInUrl = new URL('/api/auth/signin/google', url.origin)
      if (priceId) {
        signInUrl.searchParams.set('callbackUrl', `/api/stripe/checkout?priceId=${priceId}`)
      } else {
        signInUrl.searchParams.set('callbackUrl', '/pricing')
      }
      return NextResponse.redirect(signInUrl.toString())
    }

    // 2. Get priceId from query parameter
    const url = new URL(request.url)
    const priceIdParam = url.searchParams.get('priceId')
    
    if (!priceIdParam) {
      return NextResponse.json(
        { error: 'Missing priceId parameter' },
        { status: 400 }
      )
    }

    // 3. Validate priceId
    const validated = checkoutSchema.parse({ priceId: priceIdParam })

    // 4. Create checkout session (use request origin so Stripe redirect URLs are always valid)
    const requestOrigin = new URL(request.url).origin
    try {
      const checkoutSession = await createCheckoutSession(validated.priceId, session, requestOrigin)
      
      // 5. Redirect directly to Stripe Checkout
      if (checkoutSession.url) {
        return NextResponse.redirect(checkoutSession.url)
      } else {
        return NextResponse.json(
          { error: 'Failed to create checkout session URL' },
          { status: 500 }
        )
      }
    } catch (stripeError: unknown) {
      // Handle Stripe-specific errors
      const se = stripeError as Stripe.errors.StripeError
      console.error('[STRIPE ERROR] Checkout session creation failed:', {
        type: se.type,
        code: se.code,
        message: se.message,
        param: se.param,
        tier: validated.priceId,
      })

      // Return user-friendly error message
      let errorMessage = 'Failed to create checkout session'
      if (se.type === 'StripeInvalidRequestError') {
        if (se.code === 'resource_missing') {
          errorMessage = `Price ID not found. Please check your Stripe configuration.`
        } else if (se.message) {
          errorMessage = se.message
        }
      }
      
      // Redirect to pricing page with error
      const pricingUrl = new URL('/pricing', url.origin)
      pricingUrl.searchParams.set('error', encodeURIComponent(errorMessage))
      return NextResponse.redirect(pricingUrl.toString())
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const url = new URL(request.url)
      const pricingUrl = new URL('/pricing', url.origin)
      pricingUrl.searchParams.set('error', 'Invalid price tier selected')
      return NextResponse.redirect(pricingUrl.toString())
    }

    // Enhanced error logging
    console.error('Stripe checkout GET error:', error)
    const url = new URL(request.url)
    const pricingUrl = new URL('/pricing', url.origin)
    pricingUrl.searchParams.set('error', error instanceof Error ? error.message : 'Failed to create checkout session')
    return NextResponse.redirect(pricingUrl.toString())
  }
}

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

    // 2b. Fail fast if price ID not configured (e.g. missing on Vercel)
    const priceId = STRIPE_PRICE_IDS[validated.priceId]
    if (!priceId?.trim()) {
      console.error(`[CHECKOUT] Missing price ID for tier: ${validated.priceId}. Set STRIPE_*_PRICE_ID in Vercel.`)
      return NextResponse.json(
        {
          error: `Checkout not configured for ${validated.priceId}. Add STRIPE_${validated.priceId.toUpperCase()}_PRICE_ID (and other STRIPE_* env vars) in Vercel → Project → Settings → Environment Variables.`,
        },
        { status: 400 }
      )
    }

    // 3. Create checkout session (use request origin so Stripe redirect URLs are always valid)
    const requestOrigin = new URL(request.url).origin
    try {
      const checkoutSession = await createCheckoutSession(validated.priceId, session, requestOrigin)

      // 4. Return checkout URL
      return NextResponse.json({ 
        url: checkoutSession.url 
      })
    } catch (stripeError: unknown) {
      // Handle Stripe-specific and config errors (e.g. missing price ID on Vercel)
      const se = stripeError as Stripe.errors.StripeError
      console.error('[STRIPE ERROR] Checkout session creation failed:', {
        type: se?.type,
        code: se?.code,
        message: se?.message,
        param: se?.param,
        tier: validated.priceId,
      })

      let errorMessage = 'Failed to create checkout session'
      if (se?.message?.includes('Price ID not configured') || se?.message?.includes('environment variables')) {
        errorMessage = se.message
      } else if (se?.type === 'StripeInvalidRequestError') {
        if (se?.code === 'resource_missing') {
          errorMessage = 'Price ID not found. Set STRIPE_BASIC_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_UNLIMITED_PRICE_ID in Vercel.'
        } else if (se?.message) {
          errorMessage = se.message
        }
      } else if (se?.message) {
        errorMessage = se.message
      }

      return NextResponse.json(
        {
          error: errorMessage,
          type: se?.type,
          code: se?.code,
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
      const stripeError = error as Stripe.errors.StripeError
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
