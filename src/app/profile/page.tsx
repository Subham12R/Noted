"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  formatPrice,
  formatLimit,
  getUsagePercent,
  TierLimits,
  UsageStats,
} from "@/types/subscription"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface SubscriptionData {
  tier: SubscriptionTier
  limits: TierLimits
  usage: UsageStats
  subscription: {
    status: string
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
  } | null
}

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/subscription")
        if (res.ok) {
          const data = await res.json()
          setSubscriptionData(data)
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error)
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    if (isAuthenticated) {
      fetchSubscription()
    }
  }, [isAuthenticated])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground/20"></div>
      </div>
    )
  }

  const currentTier = subscriptionData?.tier || "free"
  const tier = SUBSCRIPTION_TIERS[currentTier]
  const limits = subscriptionData?.limits || tier.limits
  const usage = subscriptionData?.usage || {
    notesCount: 0,
    foldersCount: 0,
    storageUsedMB: 0,
    aiRequestsThisMonth: 0,
  }

  const userName = user.name || "User"
  const userEmail = user.email
  const avatarSrc = user.image || undefined
  const initials = getInitials(userName)
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const notesPercent = getUsagePercent(usage.notesCount, limits.maxNotes)
  const foldersPercent = getUsagePercent(usage.foldersCount, limits.maxFolders)
  const storagePercent = getUsagePercent(usage.storageUsedMB, limits.maxStorageMB)
  const aiPercent = getUsagePercent(usage.aiRequestsThisMonth, limits.maxAiRequestsPerMonth)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/60 border-b border-foreground/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground/70 hover:text-foreground no-underline transition-colors">
            <ArrowLeftIcon />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-sm font-medium">Profile</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Header - Glassmorphism */}
        <div className="rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={userName}
                  width={80}
                  height={80}
                  className="rounded-full h-20 w-20 object-cover ring-2 ring-foreground/10"
                />
              ) : (
                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-foreground/10 text-foreground text-2xl font-semibold ring-2 ring-foreground/10">
                  {initials}
                </div>
              )}
              <button className="absolute bottom-0 right-0 p-1.5 bg-background rounded-full border border-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/5">
                <CameraIcon />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{userName}</h2>
              <p className="text-foreground/50 text-sm mt-0.5">{userEmail}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-foreground/5 border border-foreground/10">
                  {tier.name} Plan
                </span>
                <span className="text-foreground/40 text-xs">Member since {memberSince}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <button className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm font-medium transition-colors border border-foreground/10">
                Edit
              </button>
              <button
                onClick={async () => {
                  await logout()
                  router.push("/login")
                }}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/15 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage & Limits */}
            <div className="rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">Usage</h3>
                <Link
                  href="/pricing"
                  className="text-xs text-foreground/50 hover:text-foreground no-underline flex items-center gap-1 transition-colors"
                >
                  Upgrade
                  <ChevronRightIcon />
                </Link>
              </div>

              {isLoadingSubscription ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 bg-foreground/[0.02] rounded-xl border border-foreground/5 animate-pulse">
                      <div className="h-10 bg-foreground/5 rounded mb-3"></div>
                      <div className="h-1.5 bg-foreground/5 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UsageCard icon={<NoteIcon />} label="Notes" used={usage.notesCount} limit={limits.maxNotes} percent={notesPercent} />
                  <UsageCard icon={<FolderIcon />} label="Folders" used={usage.foldersCount} limit={limits.maxFolders} percent={foldersPercent} />
                  <UsageCard icon={<StorageIcon />} label="Storage" used={`${usage.storageUsedMB} MB`} limit={limits.maxStorageMB > 1024 ? `${(limits.maxStorageMB / 1024).toFixed(0)} GB` : `${limits.maxStorageMB} MB`} percent={storagePercent} isString />
                  <UsageCard icon={<AIIcon />} label="AI Requests" used={usage.aiRequestsThisMonth} limit={limits.maxAiRequestsPerMonth} percent={aiPercent} suffix="/mo" />
                </div>
              )}
            </div>

            {/* Account Settings */}
            <div className="rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 p-6">
              <h3 className="font-semibold mb-5">Account</h3>
              <div className="space-y-1">
                <SettingsRow icon={<UserIcon />} label="Name" value={userName} action="Edit" />
                <SettingsRow icon={<EmailIcon />} label="Email" value={userEmail} action="Change" verified={user.emailVerified} />
                <SettingsRow icon={<LockIcon />} label="Password" value="••••••••" action="Update" />
                <SettingsRow icon={<ShieldIcon />} label="2FA" value="Off" action="Enable" />
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 p-6">
              <h3 className="font-semibold mb-5">Connected</h3>
              <div className="space-y-2">
                <ConnectedAccount icon={<GoogleIcon />} name="Google" connected={!!user.image?.includes("google")} />
                <ConnectedAccount icon={<GitHubIcon />} name="GitHub" connected={false} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-foreground/40 uppercase tracking-wider">Plan</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">{tier.name}</h3>
              <p className="text-foreground/50 text-sm mb-5">
                <span className="text-lg font-semibold text-foreground">{formatPrice(tier.price)}</span>
                {tier.period !== "forever" && <span className="text-foreground/40">/{tier.period}</span>}
              </p>

              <ul className="space-y-2 mb-5">
                {tier.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground/60">
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>

              {currentTier !== "team" && (
                <Link
                  href="/pricing"
                  className="block w-full py-2.5 bg-foreground text-background rounded-xl text-center font-medium text-sm hover:opacity-90 transition-opacity no-underline"
                >
                  Upgrade
                </Link>
              )}
            </div>

            {/* Billing */}
            <div className="rounded-2xl bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 p-6">
              <h3 className="font-semibold mb-4">Billing</h3>

              {currentTier === "free" ? (
                <div className="text-center py-2">
                  <p className="text-foreground/40 text-sm mb-4">
                    Free plan. Upgrade for more features.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 text-foreground/70 rounded-lg text-xs font-medium hover:bg-foreground/10 transition-colors no-underline border border-foreground/10"
                  >
                    View Plans
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/50">Status</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      subscriptionData?.subscription?.status === "active"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {subscriptionData?.subscription?.status || "Active"}
                    </span>
                  </div>
                  {subscriptionData?.subscription?.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-foreground/50">Renews</span>
                      <span>{new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString()}</span>
                    </div>
                  )}
                  <button className="w-full mt-3 py-2 text-sm text-foreground/50 hover:text-foreground border border-foreground/10 rounded-lg transition-colors hover:bg-foreground/5">
                    Manage
                  </button>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-6">
              <h3 className="font-semibold text-red-500 mb-3">Danger</h3>
              <p className="text-foreground/40 text-xs mb-4">
                Permanently delete your account and all data.
              </p>
              <button className="w-full py-2 text-sm text-red-500/70 hover:text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function UsageCard({
  icon,
  label,
  used,
  limit,
  percent,
  suffix = "",
  isString = false
}: {
  icon: React.ReactNode
  label: string
  used: number | string
  limit: number | string
  percent: number
  suffix?: string
  isString?: boolean
}) {
  const isUnlimited = limit === -1
  const displayLimit = isUnlimited ? "∞" : (typeof limit === "number" ? formatLimit(limit) : limit)

  return (
    <div className="p-3 bg-foreground/[0.02] rounded-xl border border-foreground/5 hover:border-foreground/10 transition-colors">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="p-1.5 bg-foreground/5 rounded-lg text-foreground/40">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-foreground/40">
            {isString ? `${used} / ${displayLimit}` : `${used} / ${displayLimit}${suffix}`}
          </p>
        </div>
      </div>
      <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent > 80 ? "bg-red-500" : percent > 50 ? "bg-amber-500" : "bg-foreground/30"
          }`}
          style={{ width: isUnlimited ? "0%" : `${percent}%` }}
        />
      </div>
    </div>
  )
}

function SettingsRow({
  icon,
  label,
  value,
  action,
  verified
}: {
  icon: React.ReactNode
  label: string
  value: string
  action: string
  verified?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-foreground/5 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-foreground/5 rounded-lg text-foreground/40">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-foreground/40">{value}</p>
            {verified !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${verified ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
                {verified ? "Verified" : "Unverified"}
              </span>
            )}
          </div>
        </div>
      </div>
      <button className="text-xs text-foreground/40 hover:text-foreground transition-colors">
        {action}
      </button>
    </div>
  )
}

function ConnectedAccount({
  icon,
  name,
  connected
}: {
  icon: React.ReactNode
  name: string
  connected: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-foreground/[0.02] rounded-xl border border-foreground/5 hover:border-foreground/10 transition-colors">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-foreground/5 rounded-lg">
          {icon}
        </div>
        <span className="text-sm font-medium">{name}</span>
      </div>
      {connected ? (
        <span className="text-xs text-green-500 flex items-center gap-1">
          <CheckIcon />
          Connected
        </span>
      ) : (
        <button className="text-xs text-foreground/40 hover:text-foreground transition-colors">
          Connect
        </button>
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

function CameraIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  )
}

function StorageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}

function AIIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}
