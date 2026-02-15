#!/usr/bin/env tsx
/**
 * Reset a user's plan to FREE (for re-testing subscription flow).
 * Usage: npx tsx scripts/reset-user-plan.ts [email]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'galaljobah@gmail.com'
  console.log(`Resetting plan to FREE for: ${email}`)

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, planTier: true, subscriptionStatus: true },
  })

  if (!user) {
    console.error('No user found with that email.')
    process.exit(1)
  }

  await prisma.user.update({
    where: { email },
    data: {
      planTier: 'FREE',
      subscriptionStatus: null,
    },
  })

  console.log('Done. Plan tier is now FREE, subscription status cleared.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
