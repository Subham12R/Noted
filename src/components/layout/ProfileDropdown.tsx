"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { signOut } from "@/lib/auth-client"
import { useAuth } from "@/context/AuthContext"

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ProfileDropdown() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const userName = user?.name || "User"
  const userEmail = user?.email || ""
  const avatarSrc = user?.image || undefined
  const initials = getInitials(userName)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center justify-center p-0 border-2 border-transparent rounded-full bg-transparent cursor-pointer transition-all duration-150 hover:border-white/20 focus:outline-none focus:border-indigo-500/50"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={userName}
            width={32}
            height={32}
            className="rounded-full h-8 w-8 object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white text-sm font-medium">
            {initials}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+0.5rem)] right-0 min-w-60 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 p-4">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={userName}
                width={40}
                height={40}
                className="rounded-full h-10 w-10 object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-600 text-white text-base font-medium">
                {initials}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{userName}</span>
              <span className="text-xs text-foreground/50 truncate">{userEmail}</span>
            </div>
          </div>

          <div className="h-px bg-white/10 my-1" />

          <div className="py-1">
            <Link href="/profile" className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground text-sm no-underline transition-all duration-150 hover:bg-white/10 [&_svg]:opacity-60 hover:[&_svg]:opacity-100" onClick={() => setIsOpen(false)}>
              <UserIcon />
              <span>Profile</span>
            </Link>
            <Link href="/settings" className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground text-sm no-underline transition-all duration-150 hover:bg-white/10 [&_svg]:opacity-60 hover:[&_svg]:opacity-100" onClick={() => setIsOpen(false)}>
              <SettingsIcon />
              <span>Settings</span>
            </Link>
            <Link href="/preferences" className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground text-sm no-underline transition-all duration-150 hover:bg-white/10 [&_svg]:opacity-60 hover:[&_svg]:opacity-100" onClick={() => setIsOpen(false)}>
              <PreferencesIcon />
              <span>Preferences</span>
            </Link>
          </div>

          <div className="h-px bg-white/10 my-1" />

          <div className="py-1">
            <Link href="/help" className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground text-sm no-underline transition-all duration-150 hover:bg-white/10 [&_svg]:opacity-60 hover:[&_svg]:opacity-100" onClick={() => setIsOpen(false)}>
              <HelpIcon />
              <span>Help & Support</span>
            </Link>
            <Link href="/keyboard-shortcuts" className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground text-sm no-underline transition-all duration-150 hover:bg-white/10 [&_svg]:opacity-60 hover:[&_svg]:opacity-100" onClick={() => setIsOpen(false)}>
              <KeyboardIcon />
              <span>Keyboard Shortcuts</span>
            </Link>
          </div>

          <div className="h-px bg-white/10 my-1" />

          <div className="py-1">
            <button
              className="flex items-center gap-3 w-full px-4 py-2.5 bg-transparent border-none text-red-500 text-sm cursor-pointer transition-all duration-150 hover:bg-red-500/10 [&_svg]:text-red-500"
              onClick={async () => {
                setIsOpen(false)
                await signOut()
                window.location.href = "/login"
              }}
            >
              <LogoutIcon />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Icons
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PreferencesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
      <path d="M6 8h.001" />
      <path d="M10 8h.001" />
      <path d="M14 8h.001" />
      <path d="M18 8h.001" />
      <path d="M8 12h.001" />
      <path d="M12 12h.001" />
      <path d="M16 12h.001" />
      <path d="M7 16h10" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}
