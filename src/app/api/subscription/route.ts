import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-utils"
import { getSubscriptionWithUsage } from "@/lib/subscription"
import { SUBSCRIPTION_TIERS } from "@/types/subscription"

// GET /api/subscription - Get user's subscription and usage info
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscriptionData = await getSubscriptionWithUsage(session.user.id)
    const tierConfig = SUBSCRIPTION_TIERS[subscriptionData.tier]

    return NextResponse.json({
      ...subscriptionData,
      tierConfig,
    })
  } catch (error) {
    console.error("Get subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
