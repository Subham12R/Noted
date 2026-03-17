"use client"

import { FolderIcon } from "@/components/tiptap-icons/folder-icon"
import { TagIcon, FileIcon, GraduationCap } from "lucide-react"

export type SidebarTab = "folders" | "tags" | "files" | "study"

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
        <FolderIcon className="w-4 h-4" />
        <span>Folders</span>
      </button>
      <button
        className="sidebar-tab"
        data-active={activeTab === "tags"}
        onClick={() => onTabChange("tags")}
      >
        <TagIcon className="w-4 h-4" />
        <span>Tags</span>
      </button>
      <button
        className="sidebar-tab"
        data-active={activeTab === "files"}
        onClick={() => onTabChange("files")}
      >
        <FileIcon className="w-4 h-4" />
        <span>Files</span>
      </button>
      <button
        className="sidebar-tab"
        data-active={activeTab === "study"}
        onClick={() => onTabChange("study")}
      >
        <GraduationCap className="w-4 h-4" />
        <span>Study</span>
      </button>
    </div>
  )
}

export default SidebarTabs
