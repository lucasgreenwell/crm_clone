"use client"

import { useState, useEffect, useRef } from "react"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

export type EntityType = 'ticket' | 'message' | 'customer' | 'employee' | 'template'

interface EntityOption {
  type: EntityType
  label: string
  icon: string
}

const ENTITY_OPTIONS: EntityOption[] = [
  { type: 'ticket', label: 'Ticket', icon: '🎫' },
  { type: 'message', label: 'Message', icon: '💬' },
  { type: 'customer', label: 'Customer', icon: '👤' },
  { type: 'employee', label: 'Employee', icon: '👔' },
  { type: 'template', label: 'Template', icon: '📝' },
]

interface MentionPopupProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: EntityType) => void
  position: { top: number; left: number }
  searchQuery?: string
}

export function MentionPopup({
  isOpen,
  onClose,
  onSelect,
  position,
  searchQuery = "",
}: MentionPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const popupRef = useRef<HTMLDivElement>(null)

  // Filter options based on search query
  const filteredOptions = ENTITY_OPTIONS.filter(option =>
    option.label.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
    option.type.toLowerCase().startsWith(searchQuery.toLowerCase())
  )

  useEffect(() => {
    // Reset selected index when filtered options change
    setSelectedIndex(0)
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
          break
        case 'Enter':
          event.preventDefault()
          if (filteredOptions[selectedIndex]) {
            onSelect(filteredOptions[selectedIndex].type)
          }
          break
        case 'Escape':
          event.preventDefault()
          onClose()
          break
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, onSelect, filteredOptions, selectedIndex])

  if (!isOpen) return null

  return (
    <div
      ref={popupRef}
      className="bg-background border rounded-lg shadow-lg w-64"
    >
      <Command>
        <CommandList>
          <CommandGroup>
            {filteredOptions.map((option, index) => (
              <CommandItem
                key={option.type}
                onSelect={() => {
                  onSelect(option.type)
                }}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  index === selectedIndex && "bg-accent"
                )}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </CommandItem>
            ))}
            {filteredOptions.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground">
                No matching options
              </div>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
} 