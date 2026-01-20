"use client"

import { useSidebarContext } from "@/context/SidebarContext"
import { SidebarIcon } from "@/components/tiptap-icons/sidebar-icon"
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"
import { ProfileDropdown } from "./ProfileDropdown"
import { useSession } from "@/lib/auth-client"
import Link from "next/link"

export function DashboardToolbar() {
  const { isOpen, toggleSidebar } = useSidebarContext()
  const { data: session } = useSession()

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
        <Link
          href="/upgrade"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium tracking-tight text-foreground bg-white/10 border border-white/10 rounded-xl no-underline transition-all duration-150 hover:bg-white/15 hover:border-white/20"
        >
          Go +
        </Link>
        <ThemeToggle />
        <ProfileDropdown
          userName={session?.user?.name || undefined}
          userEmail={session?.user?.email || undefined}
          avatarSrc={session?.user?.image || undefined}
        />
      </div>
    </div>
  )
}
