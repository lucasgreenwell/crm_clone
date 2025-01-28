"use client"

import { useState, useEffect, useRef } from "react"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Ticket, Message, User, Template } from "@/app/types/database"

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
}

export function MentionPopup({
  isOpen,
  onClose,
  onSelect,
  position,
}: MentionPopupProps) {
  const [selectedType, setSelectedType] = useState<EntityType | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={popupRef}
      className="bg-background border rounded-lg shadow-lg w-64"
    >
      <Command>
        <CommandGroup>
          {ENTITY_OPTIONS.map((option) => (
            <CommandItem
              key={option.type}
              onSelect={() => {
                setSelectedType(option.type)
                onSelect(option.type)
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </Command>
    </div>
  )
} 