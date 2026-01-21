import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

// Client-side Stripe initialization (singleton)
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe failed to initialize')
  }

  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) {
    throw new Error(error.message)
  }
}

// Types for checkout API response
export interface CheckoutResponse {
  sessionId: string
  url: string
}

// Create checkout session via API
export async function createCheckoutSession(
  tier: 'pro' | 'team',
  interval: 'month' | 'year'
): Promise<CheckoutResponse> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tier, interval }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create checkout session')
  }

  return response.json()
}

// Get customer portal URL
export async function getCustomerPortalUrl(): Promise<string> {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create portal session')
  }

  const data = await response.json()
  return data.url
}
