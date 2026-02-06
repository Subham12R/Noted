"use client"

import { Search } from "lucide-react"
import { useState } from "react"

interface SidebarSearchProps {
  onSearchClick?: () => void
  placeholder?: string
}

export function SidebarSearch({ onSearchClick, placeholder = "Search" }: SidebarSearchProps) {
  return (
    <div className="sidebar-search" onClick={onSearchClick}>
      <Search size={16} className="sidebar-search-icon" />
      <span className="sidebar-search-placeholder">{placeholder}</span>
    </div>
  )
}

export default SidebarSearch
