import Stripe from 'stripe'
import { logger } from '@/lib/logger'

const stripeKey = process.env.STRIPE_SECRET_KEY
const isTestMode = stripeKey?.startsWith('sk_test_') ?? false

// Only initialize Stripe if the key is available
// This allows the build to complete even if env vars aren't set yet
let stripeInstance: Stripe | null = null

function getStripeInstance(): Stripe {
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(stripeKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// Export a getter function instead of the instance directly
// This prevents build-time errors when env vars aren't set
export const stripe = getStripeInstance

// Price IDs for each tier
export const STRIPE_PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  unlimited: process.env.STRIPE_UNLIMITED_PRICE_ID || '',
} as const

// Validate price IDs match the key mode (test vs live)
const validatePriceIds = () => {
  const priceIds = Object.values(STRIPE_PRICE_IDS).filter(Boolean)
  
  for (const priceId of priceIds) {
    if (!priceId) continue
    
    // Test mode price IDs start with price_1... (can be test or live)
    // But we should warn if there's a mismatch
    const isTestPrice = priceId.includes('test') || priceId.startsWith('price_1')
    
    if (isTestMode && !isTestPrice && !priceId.startsWith('price_')) {
      logger.warn(`⚠️  Warning: Using test key but price ID "${priceId}" might be for live mode`)
    }
    
    if (!isTestMode && isTestPrice) {
      logger.warn(`⚠️  Warning: Using live key but price ID "${priceId}" appears to be for test mode`)
    }
  }
}

// Validate on module load
if (process.env.NODE_ENV !== 'production') {
  validatePriceIds()
}

// Validate that required price IDs are set
if (!STRIPE_PRICE_IDS.unlimited) {
  logger.warn('⚠️  STRIPE_UNLIMITED_PRICE_ID is not set in environment variables')
}
if (!STRIPE_PRICE_IDS.basic) {
  logger.warn('⚠️  STRIPE_BASIC_PRICE_ID is not set in environment variables')
}
if (!STRIPE_PRICE_IDS.pro) {
  logger.warn('⚠️  STRIPE_PRO_PRICE_ID is not set in environment variables')
}

export type SubscriptionTier = keyof typeof STRIPE_PRICE_IDS
export { isTestMode }
