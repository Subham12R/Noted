"use client"

import { FolderIcon } from "@/components/tiptap-icons/folder-icon"
import { TagIcon } from "lucide-react"
import { GraduationCap } from "lucide-react"

export type SidebarTab = "folders" | "tags" | "study"

interface SidebarTabsProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
}

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  return (
    <div className="sidebar-tabs">
      <button
        className="sidebar-tab"
        data-active={activeTab === "folders"}
        onClick={() => onTabChange("folders")}
      >
        Folders
      </button>
      <button
        className="sidebar-tab"
        data-active={activeTab === "tags"}
        onClick={() => onTabChange("tags")}
      >
        Tags
      </button>
      <button
        className="sidebar-tab"
        data-active={activeTab === "study"}
        onClick={() => onTabChange("study")}
      >
        Study
      </button>
    </div>
  )
}

export default SidebarTabs
