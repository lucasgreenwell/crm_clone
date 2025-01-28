"use client"

import { useState, useEffect, useMemo } from "react"
import { Command, CommandGroup, CommandItem, CommandInput, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"
import { EntityType } from "./MentionPopup"
import { cn } from "@/lib/utils"

interface EntitySearchResultsProps {
  type: EntityType
  searchQuery: string
  onSelect: (entity: any) => void
  onClose: () => void
  onBack: () => void
  position: { top: number; left: number }
}

export function EntitySearchResults({
  type,
  searchQuery,
  onSelect,
  onClose,
  onBack,
  position,
}: EntitySearchResultsProps) {
  const [entities, setEntities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [localSearch, setLocalSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const fetchEntities = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/ai/entities?type=${type}`)
        if (!response.ok) throw new Error('Failed to fetch entities')
        const data = await response.json()
        setEntities(data)
      } catch (error) {
        console.error('Error fetching entities:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntities()
  }, [type])

  const filteredEntities = useMemo(() => {
    const searchTerm = (localSearch || searchQuery).toLowerCase()
    if (!searchTerm) return entities

    return entities.filter(entity => {
      const searchableText = getSearchableText(entity, type).toLowerCase()
      return searchableText.includes(searchTerm)
    })
  }, [entities, localSearch, searchQuery, type])

  useEffect(() => {
    // Reset selected index when filtered results change
    setSelectedIndex(0)
  }, [filteredEntities])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredEntities.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
          break
        case 'Enter':
          event.preventDefault()
          if (filteredEntities[selectedIndex]) {
            onSelect(filteredEntities[selectedIndex])
          }
          break
        case 'Escape':
          event.preventDefault()
          onClose()
          break
        case 'Backspace':
          if (!localSearch) {
            event.preventDefault()
            onBack()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredEntities, selectedIndex, onSelect, onClose, onBack, localSearch])

  const getSearchableText = (entity: any, type: EntityType): string => {
    switch (type) {
      case 'ticket':
        return `${entity.id} ${entity.subject} ${entity.status} ${entity.priority}`
      case 'message':
        return entity.message
      case 'customer':
      case 'employee':
        return `${entity.display_name} ${entity.email}`
      case 'template':
        return entity.name
      default:
        return ''
    }
  }

  const getDisplayText = (entity: any) => {
    switch (type) {
      case 'ticket':
        return `#${entity.id.slice(0, 8)} - ${entity.subject} (${entity.status})`
      case 'message':
        return entity.message
      case 'customer':
      case 'employee':
        return `${entity.display_name} (${entity.email})`
      case 'template':
        return entity.name
      default:
        return 'Unknown entity'
    }
  }

  return (
    <div className="bg-background border rounded-lg shadow-lg w-96">
      <Command>
        <div className="flex items-center gap-2 p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CommandInput
            placeholder={`Search ${type}s...`}
            value={localSearch}
            onValueChange={setLocalSearch}
          />
        </div>
        <CommandList>
          <CommandGroup heading={`Select ${type}`}>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filteredEntities.map((entity, index) => (
                <CommandItem
                  key={entity.id}
                  onSelect={() => {
                    onSelect(entity)
                    onClose()
                  }}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    index === selectedIndex && "bg-accent"
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="truncate">{getDisplayText(entity)}</span>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
} 