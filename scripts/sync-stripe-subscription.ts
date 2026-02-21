#!/usr/bin/env tsx
/**
 * One-off: sync a user's plan from Stripe into the database (e.g. after payment
 * before the webhook was configured). Uses Stripe API to find the subscription
 * for the given email and updates the user in the DB.
 *
 * Usage: npx tsx scripts/sync-stripe-subscription.ts <email>
 * Example: npx tsx scripts/sync-stripe-subscription.ts user@example.com
 *
 * Requires: .env or .env.local with STRIPE_SECRET_KEY, STRIPE_*_PRICE_ID, DATABASE_URL
 */

import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const prisma = new PrismaClient()

const STRIPE_PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  unlimited: process.env.STRIPE_UNLIMITED_PRICE_ID || '',
}

type PlanTier = 'FREE' | 'BASIC' | 'PRO' | 'UNLIMITED'

function priceIdToTier(priceId: string): PlanTier {
  if (priceId === STRIPE_PRICE_IDS.basic) return 'BASIC'
  if (priceId === STRIPE_PRICE_IDS.pro) return 'PRO'
  if (priceId === STRIPE_PRICE_IDS.unlimited) return 'UNLIMITED'
  return 'BASIC'
}

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npx tsx scripts/sync-stripe-subscription.ts <email>')
    process.exit(1)
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY is not set in .env or .env.local')
    process.exit(1)
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' })

  console.log(`\nSyncing plan from Stripe for: ${email}\n`)

  // 1. Find user in our DB
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, planTier: true, subscriptionStatus: true },
  })
  if (!user) {
    console.error('No user found in database with that email.')
    process.exit(1)
  }

  // 2. Find customer in Stripe by email
  const customers = await stripe.customers.list({ email, limit: 1 })
  const customer = customers.data[0]
  if (!customer) {
    console.error('No Stripe customer found with that email. Has this customer completed checkout?')
    process.exit(1)
  }

  // 3. Find active subscription for this customer
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: 'active',
    limit: 1,
  })
  const subscription = subs.data[0]
  if (!subscription) {
    console.error('No active subscription found for this customer in Stripe.')
    process.exit(1)
  }

  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) {
    console.error('Could not get price from subscription.')
    process.exit(1)
  }

  const planTier = priceIdToTier(priceId)
  console.log('Stripe subscription found:')
  console.log('  Customer ID:', customer.id)
  console.log('  Subscription ID:', subscription.id)
  console.log('  Price ID:', priceId)
  console.log('  Plan tier:', planTier)

  // 4. Update user in DB
  await prisma.user.update({
    where: { id: user.id },
    data: {
      planTier,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: 'active',
    },
  })

  console.log('\nUpdated user in database:')
  console.log('  Email:', user.email)
  console.log('  Plan tier:', planTier)
  console.log('  Subscription status: active')
  console.log('\nDone. You can run check-user-plan.ts to verify.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
