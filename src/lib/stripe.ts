import Stripe from 'stripe'

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})

// Price IDs mapping
export const STRIPE_PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_TEAM_YEARLY!,
  },
} as const

// Get price ID based on tier and interval
export function getPriceId(tier: 'pro' | 'team', interval: 'month' | 'year'): string {
  const intervalKey = interval === 'month' ? 'monthly' : 'yearly'
  return STRIPE_PRICE_IDS[tier][intervalKey]
}

// Get tier from price ID (reverse lookup)
export function getTierFromPriceId(priceId: string): { tier: 'pro' | 'team'; interval: 'month' | 'year' } | null {
  for (const [tier, prices] of Object.entries(STRIPE_PRICE_IDS)) {
    if (prices.monthly === priceId) {
      return { tier: tier as 'pro' | 'team', interval: 'month' }
    }
    if (prices.yearly === priceId) {
      return { tier: tier as 'pro' | 'team', interval: 'year' }
    }
  }
  return null
}

// Create or get Stripe customer
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // Import db functions here to avoid circular dependencies
  const { db, subscriptions } = await import('@/db')
  const { eq } = await import('drizzle-orm')

  // Check if user already has a Stripe customer ID
  const [existingSub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  if (existingSub?.stripeCustomerId) {
    // Verify the customer still exists in Stripe (handles switching between test/live modes)
    try {
      await stripe.customers.retrieve(existingSub.stripeCustomerId)
      return existingSub.stripeCustomerId
    } catch (err) {
      // Customer doesn't exist (likely due to test/live mode switch), create a new one
      console.log('Existing Stripe customer not found, creating new one...')
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  })

  // Save customer ID to database (clear old subscription data too)
  await db
    .insert(subscriptions)
    .values({
      userId,
      tier: 'free',
      status: 'active',
      stripeCustomerId: customer.id,
      stripeSubscriptionId: null,
      stripePriceId: null,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: null,
        stripePriceId: null,
        tier: 'free',
        status: 'active',
        updatedAt: new Date(),
      },
    })

  return customer.id
}

// Create checkout session
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        userId,
      },
    },
    metadata: {
      userId,
    },
  })

  return session
}

// Create customer portal session
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  return subscription
}

// Resume subscription (undo cancellation)
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })

  return subscription
}

// Update subscription (change plan)
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })

  return updatedSubscription
}
