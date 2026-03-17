"use client"

import { useState, useEffect } from "react"
import { useSidebarContext } from "@/context/SidebarContext"
import { SidebarIcon } from "@/components/tiptap-icons/sidebar-icon"
import { DashboardThemeToggle } from "@/components/dashboard/ThemeToggle"
import { ProfileDropdown } from "./ProfileDropdown"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import type { SubscriptionTier } from "@/types/subscription"

export function DashboardToolbar() {
  const { isOpen, toggleSidebar } = useSidebarContext()
  const { isAuthenticated } = useAuth()
  const [tier, setTier] = useState<SubscriptionTier>("free")

  useEffect(() => {
    async function fetchSubscription() {
      if (!isAuthenticated) return
      try {
        const res = await fetch("/api/subscription")
        if (res.ok) {
          const data = await res.json()
          setTier(data.tier)
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error)
      }
    }
    fetchSubscription()
  }, [isAuthenticated])

  const isPaidUser = tier === "pro" || tier === "team"

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <button
          className={`flex items-center justify-center w-9 h-9 rounded-lg border-none bg-transparent text-neutral-900 dark:text-white cursor-pointer transition-all duration-150 hover:bg-neutral-100 dark:hover:bg-white/10 ${isOpen ? 'bg-neutral-100 dark:bg-white/15' : ''}`}
          onClick={toggleSidebar}
          title="Toggle Sidebar"
        >
          <SidebarIcon />
        </button>
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />
        <Link href="/" className="text-2xl text-neutral-900 dark:text-white no-underline px-2 font-grandhotel">
          Noted.
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {isPaidUser ? (
          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-tight text-neutral-900 dark:text-white bg-neutral-100 dark:bg-white/5 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg no-underline transition-all duration-200 hover:bg-neutral-200 dark:hover:bg-white/10"
          >
            {tier === "team" ? "Team" : "Pro"}
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-tight text-neutral-900 dark:text-white bg-neutral-100 dark:bg-white/5 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg no-underline transition-all duration-200 hover:bg-neutral-200 dark:hover:bg-white/10"
          >
            Get +
          </Link>
        )}
        <DashboardThemeToggle />
        <ProfileDropdown />
      </div>
    </div>
  )
}
