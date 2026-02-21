#!/usr/bin/env tsx
/**
 * Check which plan is linked to a user in the database.
 * Usage: npx tsx scripts/check-user-plan.ts [email]
 * Example: npx tsx scripts/check-user-plan.ts user@example.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || ''
  console.log(`\nLooking up: ${email}\n`)

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      planTier: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      updatedAt: true,
    },
  })

  if (!user) {
    console.log('No user found with that email.')
    process.exit(1)
  }

  console.log('--- User plan (from DB) ---')
  console.log('Email:', user.email)
  console.log('Name:', user.name ?? '(none)')
  console.log('Plan tier:', user.planTier)
  console.log('Subscription status:', user.subscriptionStatus ?? '(null)')
  console.log('Stripe customer ID:', user.stripeCustomerId ?? '(none)')
  console.log('Stripe subscription ID:', user.stripeSubscriptionId ?? '(none)')
  console.log('Last updated:', user.updatedAt ?? '(none)')
  console.log('----------------------------\n')

  if (user.subscriptionStatus === 'active' && user.planTier !== 'FREE') {
    console.log('Yes – this account has a paid plan linked.')
  } else {
    console.log('No – subscription not active or plan is FREE. Webhook may not have run yet.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
