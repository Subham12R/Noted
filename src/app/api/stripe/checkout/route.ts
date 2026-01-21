import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-utils'
import {
  stripe,
  getPriceId,
  getOrCreateStripeCustomer,
  createCheckoutSession
} from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tier, interval } = await request.json()

    // Validate input
    if (!tier || !['pro', 'team'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    if (!interval || !['month', 'year'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    }

    const userId = session.user.id
    const email = session.user.email
    const name = session.user.name

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, email, name)

    // Get the correct price ID
    const priceId = getPriceId(tier, interval)

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const checkoutSession = await createCheckoutSession(
      customerId,
      priceId,
      userId,
      `${appUrl}/pricing?success=true`,
      `${appUrl}/pricing?canceled=true`
    )

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
