"use client"

import { useState, useEffect } from "react"
import { useSidebarContext } from "@/context/SidebarContext"
import { SidebarIcon } from "@/components/tiptap-icons/sidebar-icon"
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"
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
    <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-zinc-950/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-2">
        <button
          className={`flex items-center justify-center w-9 h-9 rounded-lg border-none bg-transparent text-foreground cursor-pointer transition-all duration-150 hover:bg-white/10 [&_svg]:w-5 [&_svg]:h-5 ${isOpen ? 'bg-white/15' : ''}`}
          onClick={toggleSidebar}
          title="Toggle Sidebar"
        >
          <SidebarIcon />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <Link href="/" className="text-2xl text-foreground no-underline px-2 font-grandhotel">
          Noted.
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {isPaidUser ? (
          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-tight text-foreground bg-white/5 backdrop-blur-md border border-white/10 rounded-lg no-underline transition-all duration-200 hover:bg-white/10 hover:border-white/20"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            {tier === "team" ? "Team" : "Pro"}
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-tight text-foreground bg-white/5 backdrop-blur-md border border-white/10 rounded-lg no-underline transition-all duration-200 hover:bg-white/10 hover:border-white/20"
          >
 
            Get +
          </Link>
        )}
        
        <ProfileDropdown />
      </div>
    </div>
  )
}
