"use client"

import { useEffect, useRef, useState } from 'react'
import { Point } from './types'

export interface SlashCommand {
  id: string
  label: string
  shortcut: string
  description: string
  icon: React.ReactNode
  category: 'text' | 'shapes' | 'elements'
}

interface SlashCommandMenuProps {
  position: Point
  searchQuery: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
}

const HeadingIcon = ({ level }: { level: number }) => (
  <div className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-600">
    H{level}
  </div>
)

const TextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
  </svg>
)

const RectIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
  </svg>
)

const CircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" strokeWidth={2} />
  </svg>
)

const LineIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
  </svg>
)

const ArrowIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
    <polyline points="10,4 20,4 20,14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const NoteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const StickyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)

export const slashCommands: SlashCommand[] = [
  // Text elements
  { id: 'h1', label: 'Heading 1', shortcut: '/h1', description: 'Large heading', icon: <HeadingIcon level={1} />, category: 'text' },
  { id: 'h2', label: 'Heading 2', shortcut: '/h2', description: 'Medium heading', icon: <HeadingIcon level={2} />, category: 'text' },
  { id: 'h3', label: 'Heading 3', shortcut: '/h3', description: 'Small heading', icon: <HeadingIcon level={3} />, category: 'text' },
  { id: 'text', label: 'Text', shortcut: '/text', description: 'Plain text', icon: <TextIcon />, category: 'text' },

  // Shapes
  { id: 'rectangle', label: 'Rectangle', shortcut: '/rect', description: 'Draw a rectangle', icon: <RectIcon />, category: 'shapes' },
  { id: 'circle', label: 'Circle', shortcut: '/circle', description: 'Draw a circle', icon: <CircleIcon />, category: 'shapes' },
  { id: 'line', label: 'Line', shortcut: '/line', description: 'Draw a line', icon: <LineIcon />, category: 'shapes' },
  { id: 'arrow', label: 'Arrow', shortcut: '/arrow', description: 'Draw an arrow', icon: <ArrowIcon />, category: 'shapes' },

  // Elements
  { id: 'note', label: 'Note', shortcut: '/note', description: 'Add a note card', icon: <NoteIcon />, category: 'elements' },
  { id: 'sticky', label: 'Sticky Note', shortcut: '/sticky', description: 'Add a sticky note', icon: <StickyIcon />, category: 'elements' },
]

export function SlashCommandMenu({ position, searchQuery, onSelect, onClose }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter commands based on search query (remove the leading /)
  const query = searchQuery.startsWith('/') ? searchQuery.slice(1).toLowerCase() : searchQuery.toLowerCase()
  const filteredCommands = slashCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(query) ||
    cmd.shortcut.toLowerCase().includes('/' + query) ||
    cmd.id.toLowerCase().includes(query)
  )

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCommands, selectedIndex, onSelect, onClose])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, SlashCommand[]>)

  const categoryLabels: Record<string, string> = {
    text: 'Text',
    shapes: 'Shapes',
    elements: 'Elements',
  }

  // Calculate flat index for selection
  let flatIndex = 0
  const getCommandIndex = (category: string, idx: number) => {
    let result = 0
    for (const cat of ['text', 'shapes', 'elements']) {
      if (cat === category) {
        return result + idx
      }
      result += (groupedCommands[cat]?.length || 0)
    }
    return result
  }

  if (filteredCommands.length === 0) {
    return (
      <div
        ref={menuRef}
        className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]"
        style={{ left: position.x, top: position.y }}
      >
        <p className="text-sm text-gray-500">No commands found</p>
      </div>
    )
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[240px] max-h-[300px] overflow-y-auto"
      style={{ left: position.x, top: position.y }}
    >
      {/* Search input display */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-sm text-gray-600 font-mono">{searchQuery || '/'}</span>
      </div>

      {/* Commands list */}
      <div className="py-1">
        {['text', 'shapes', 'elements'].map(category => {
          const commands = groupedCommands[category]
          if (!commands || commands.length === 0) return null

          return (
            <div key={category}>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {categoryLabels[category]}
              </div>
              {commands.map((cmd, idx) => {
                const commandIndex = getCommandIndex(category, idx)
                const isSelected = commandIndex === selectedIndex

                return (
                  <button
                    key={cmd.id}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => onSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(commandIndex)}
                  >
                    <span className={`${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                      {cmd.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{cmd.label}</div>
                      <div className={`text-xs ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                        {cmd.description}
                      </div>
                    </div>
                    <span className={`text-xs font-mono ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                      {cmd.shortcut}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
