"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  formatPrice,
} from "@/types/subscription"
import { createCheckoutSession } from "@/lib/stripe-client"

// Component that handles search params (needs Suspense boundary)
function PricingSearchParamsHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")

    if (success === "true") {
      toast.success("Payment successful! Your subscription is now active.", {
        duration: 5000,
      })
      router.replace("/pricing")
    } else if (canceled === "true") {
      toast.info("Checkout was canceled. You can try again anytime.")
      router.replace("/pricing")
    }
  }, [searchParams, router])

  return null
}

export default function PricingPage() {
  const { isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month")
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free")
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false)

  useEffect(() => {
    async function fetchSubscription() {
      if (!isAuthenticated) {
        setIsLoadingSubscription(false)
        return
      }

      try {
        const res = await fetch("/api/subscription")
        if (res.ok) {
          const data = await res.json()
          setCurrentTier(data.tier)
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error)
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    if (!isLoading) {
      fetchSubscription()
    }
  }, [isAuthenticated, isLoading])

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/pricing&plan=${tier}`)
      return
    }

    if (tier === "free") {
      router.push("/profile")
      return
    }

    // Start Stripe checkout
    setIsProcessingCheckout(true)
    try {
      const { url } = await createCheckoutSession(tier as 'pro' | 'team', billingPeriod)
      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start checkout")
      setIsProcessingCheckout(false)
    }
  }

  const tiers: SubscriptionTier[] = ["free", "pro", "team"]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Handle search params from Stripe redirect */}
      <Suspense fallback={null}>
        <PricingSearchParamsHandler />
      </Suspense>

      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/60 border-b border-foreground/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground/70 hover:text-foreground no-underline transition-colors">
            <ArrowLeftIcon />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <Link href="/" className="text-2xl text-foreground no-underline font-grandhotel">
            Noted.
          </Link>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section - Clean & Minimal */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Get Started with <span className="font-grandhotel italic font-bold">Noted.</span>
          </h1>
          <p className="text-lg text-foreground/50 max-w-xl mx-auto">
            Start for free, upgrade when you need more. No hidden fees.
          </p>

          {/* Billing Toggle - Glassmorphism */}
          <div className="inline-flex items-center gap-1 p-1 mt-8 bg-foreground/5 backdrop-blur-md border border-foreground/10 rounded-xl">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === "month"
                  ? "bg-foreground text-background"
                  : "text-foreground/60 hover:text-foreground"
              }`}
              onClick={() => setBillingPeriod("month")}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === "year"
                  ? "bg-foreground text-background"
                  : "text-foreground/60 hover:text-foreground"
              }`}
              onClick={() => setBillingPeriod("year")}
            >
              Yearly
              <span className="px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-500 text-xs font-medium">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards - Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {tiers.map((tier) => {
            const config = SUBSCRIPTION_TIERS[tier]
            const isCurrentPlan = currentTier === tier
            const isPopular = tier === "pro"
            const price =
              billingPeriod === "year" && config.price > 0
                ? Math.floor(config.price * 12 * 0.8)
                : config.price
            const displayPrice =
              billingPeriod === "year" && config.price > 0
                ? formatPrice(Math.floor((price / 12)))
                : formatPrice(config.price)

            return (
              <div
                key={tier}
                className={`relative rounded-2xl p-6 transition-all duration-300 backdrop-blur-xl ${
                  isPopular
                    ? "bg-foreground/[0.03] border-2 border-foreground/20 scale-[1.02]"
                    : "bg-foreground/[0.02] border border-foreground/10 hover:border-foreground/20"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background rounded-full text-xs font-medium">
                    Popular
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 bg-foreground/10 text-foreground/70 rounded-md text-xs font-medium">
                    Current
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{config.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{displayPrice}</span>
                    {config.price > 0 && (
                      <span className="text-foreground/40 text-sm">/mo</span>
                    )}
                  </div>
                  {billingPeriod === "year" && config.price > 0 && (
                    <p className="text-xs text-foreground/40 mt-1">
                      {formatPrice(price)} billed yearly
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {config.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <CheckIcon className="text-foreground/40 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={isCurrentPlan || isLoadingSubscription || isProcessingCheckout}
                  className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isCurrentPlan
                      ? "bg-foreground/5 text-foreground/30 cursor-not-allowed"
                      : isPopular
                      ? "bg-foreground text-background hover:opacity-90"
                      : "bg-foreground/10 text-foreground hover:bg-foreground/15 border border-foreground/10"
                  }`}
                >
                  {isLoadingSubscription
                    ? "Loading..."
                    : isProcessingCheckout
                    ? "Redirecting..."
                    : isCurrentPlan
                    ? "Current Plan"
                    : tier === "free"
                    ? "Get Started"
                    : `Upgrade to ${config.name}`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison - Glassmorphism */}
        <div className="rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 overflow-hidden">
          <div className="p-6 border-b border-foreground/10">
            <h2 className="text-xl font-semibold">Compare plans</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left p-4 text-foreground/50 font-medium text-sm">Feature</th>
                  {tiers.map((tier) => (
                    <th key={tier} className="text-center p-4 font-medium text-sm">
                      {SUBSCRIPTION_TIERS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <FeatureRow feature="Notes" values={["10", "100", "Unlimited"]} />
                <FeatureRow feature="Folders" values={["3", "20", "Unlimited"]} />
                <FeatureRow feature="Collaborators" values={["2", "10", "Unlimited"]} />
                <FeatureRow feature="Storage" values={["100 MB", "5 GB", "50 GB"]} />
                <FeatureRow feature="AI requests/mo" values={["10", "500", "Unlimited"]} />
                <FeatureRow feature="Real-time collab" values={[true, true, true]} />
                <FeatureRow feature="Priority support" values={[false, true, true]} />
                <FeatureRow feature="Custom branding" values={[false, false, true]} />
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold text-center mb-8">
            Questions & Answers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <FAQItem
              question="Can I change plans anytime?"
              answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences."
            />
            <FAQItem
              question="What happens when I reach my limit?"
              answer="You'll be notified when approaching limits. Once reached, you won't be able to create new items until you upgrade or delete existing ones."
            />
            <FAQItem
              question="Is there a free trial?"
              answer="Yes, Pro and Team plans come with a 14-day free trial. No credit card required to start."
            />
            <FAQItem
              question="How does billing work?"
              answer="We bill monthly or annually. Annual plans save you 20% compared to monthly billing."
            />
          </div>
        </div>

        {/* CTA Section - Clean */}
        <div className="mt-20 text-center">
          <div className="inline-flex flex-col items-center p-8 rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10">
            <h3 className="text-xl font-semibold mb-2">Ready to get started?</h3>
            <p className="text-foreground/50 text-sm mb-6">
              Join thousands of users already using Noted.
            </p>
            <Link
              href={isAuthenticated ? "/" : "/register"}
              className="px-6 py-2.5 bg-foreground text-background rounded-xl font-medium text-sm hover:opacity-90 transition-opacity no-underline"
            >
              {isAuthenticated ? "Go to Dashboard" : "Start Free"}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-foreground/5 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-foreground/30 text-sm">
          <p>&copy; 2025 Noted. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureRow({
  feature,
  values,
}: {
  feature: string
  values: (string | boolean)[]
}) {
  return (
    <tr className="border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors">
      <td className="p-4 text-foreground/50 text-sm">{feature}</td>
      {values.map((value, i) => (
        <td key={i} className="text-center p-4">
          {typeof value === "boolean" ? (
            value ? (
              <CheckIcon className="inline text-foreground/50" />
            ) : (
              <span className="text-foreground/20">—</span>
            )
          ) : (
            <span className="text-sm font-medium">{value}</span>
          )}
        </td>
      ))}
    </tr>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left font-medium text-sm hover:bg-foreground/[0.02] transition-colors"
      >
        <span>{question}</span>
        <ChevronIcon className={`text-foreground/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-foreground/50 text-sm">
          {answer}
        </div>
      )}
    </div>
  )
}

// Icons
function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
