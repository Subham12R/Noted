import { NextRequest, NextResponse } from 'next/server'
import { stripe, getTierFromPriceId } from '@/lib/stripe'
import { db, subscriptions } from '@/db'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Disable body parsing - we need raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
}

async function getRawBody(request: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  const reader = request.body?.getReader()

  if (!reader) {
    throw new Error('No request body')
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  return Buffer.concat(chunks)
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const isDev = process.env.NODE_ENV === 'development'

  let event: Stripe.Event

  try {
    const rawBody = await getRawBody(request)
    const signature = request.headers.get('stripe-signature')

    // In development without webhook secret, parse the event directly (less secure, dev only)
    if (isDev && (!webhookSecret || webhookSecret === 'whsec_test_placeholder')) {
      console.warn('⚠️ DEV MODE: Skipping webhook signature verification')
      event = JSON.parse(rawBody.toString()) as Stripe.Event
    } else {
      // Production: verify signature
      if (!webhookSecret) {
        console.error('Missing STRIPE_WEBHOOK_SECRET')
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
      }

      if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
      }

      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  // Retrieve subscription details
  const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
  const priceId = subscriptionData.items.data[0]?.price.id
  const tierInfo = getTierFromPriceId(priceId)

  if (!tierInfo) {
    console.error('Unknown price ID:', priceId)
    return
  }

  // Get period timestamps
  const periodStart = (subscriptionData as any).current_period_start || Math.floor(Date.now() / 1000)
  const periodEnd = (subscriptionData as any).current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

  // Update subscription in database
  await db
    .insert(subscriptions)
    .values({
      userId,
      tier: tierInfo.tier,
      status: 'active',
      billingInterval: tierInfo.interval,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        tier: tierInfo.tier,
        status: 'active',
        billingInterval: tierInfo.interval,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
        updatedAt: new Date(),
      },
    })

  console.log(`Subscription created for user ${userId}: ${tierInfo.tier} (${tierInfo.interval})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  const tierInfo = getTierFromPriceId(priceId)

  // Find user by customer ID
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1)

  if (!existingSub) {
    console.error('No subscription found for customer:', customerId)
    return
  }

  // Map Stripe status to our status
  let status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active'
  switch (subscription.status) {
    case 'active':
      status = 'active'
      break
    case 'canceled':
      status = 'canceled'
      break
    case 'past_due':
      status = 'past_due'
      break
    case 'trialing':
      status = 'trialing'
      break
    default:
      status = 'active'
  }

  // Get period timestamps
  const periodStart = (subscription as any).current_period_start || Math.floor(Date.now() / 1000)
  const periodEnd = (subscription as any).current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

  // Update subscription
  await db
    .update(subscriptions)
    .set({
      tier: tierInfo?.tier || existingSub.tier,
      status,
      billingInterval: tierInfo?.interval || existingSub.billingInterval,
      stripePriceId: priceId,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId))

  console.log(`Subscription updated for customer ${customerId}: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Reset to free tier
  await db
    .update(subscriptions)
    .set({
      tier: 'free',
      status: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      billingInterval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId))

  console.log(`Subscription canceled for customer ${customerId}, reverted to free tier`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Payment succeeded, ensure subscription is active
  await db
    .update(subscriptions)
    .set({
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId))

  console.log(`Payment succeeded for customer ${customerId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Mark subscription as past due
  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId))

  console.log(`Payment failed for customer ${customerId}`)
}
