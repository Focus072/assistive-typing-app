import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

const stripeKey = process.env.STRIPE_SECRET_KEY
const isTestMode = stripeKey.startsWith('sk_test_')

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
})

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
      console.warn(`⚠️  Warning: Using test key but price ID "${priceId}" might be for live mode`)
    }
    
    if (!isTestMode && isTestPrice) {
      console.warn(`⚠️  Warning: Using live key but price ID "${priceId}" appears to be for test mode`)
    }
  }
}

// Validate on module load
if (process.env.NODE_ENV !== 'production') {
  validatePriceIds()
}

// Validate that required price IDs are set
if (!STRIPE_PRICE_IDS.unlimited) {
  console.warn('⚠️  STRIPE_UNLIMITED_PRICE_ID is not set in environment variables')
}
if (!STRIPE_PRICE_IDS.basic) {
  console.warn('⚠️  STRIPE_BASIC_PRICE_ID is not set in environment variables')
}
if (!STRIPE_PRICE_IDS.pro) {
  console.warn('⚠️  STRIPE_PRO_PRICE_ID is not set in environment variables')
}

export type SubscriptionTier = keyof typeof STRIPE_PRICE_IDS
export { isTestMode }
