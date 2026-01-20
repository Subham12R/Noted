"use client"

import { Button } from "@/components/tiptap-ui-primitive/button"
import { SidebarIcon } from "@/components/tiptap-icons/sidebar-icon"

export interface SidebarButtonProps {
  onClick: () => void
  isOpen?: boolean
}

export function SidebarButton({ onClick, isOpen }: SidebarButtonProps) {
  return (
    <Button
      type="button"
      data-style="ghost"
      data-active={isOpen}
      onClick={onClick}
      tooltip="Toggle Sidebar"
      aria-label="Toggle Sidebar"
    >
      <SidebarIcon className="tiptap-button-icon" />
    </Button>
  )
}
