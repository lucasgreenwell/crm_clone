"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { useDebounce } from "@/app/hooks/useDebounce"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface User {
  user_id: string
  display_name: string
  role: string
}

interface UserSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserSelect: (user: User) => void
}

export function UserSearchModal({ open, onOpenChange, onUserSelect }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 100) // Reduced debounce time since it's client-side

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/users/search')
        if (!response.ok) throw new Error("Failed to fetch users")
        const data = await response.json()
        setAllUsers(data)
        setFilteredUsers(data)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      fetchUsers()
    }
  }, [open])

  // Filter users based on search query
  useEffect(() => {
    const query = debouncedSearch.toLowerCase()
    const filtered = allUsers.filter(user => 
      user.display_name.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    )
    setFilteredUsers(filtered)
  }, [debouncedSearch, allUsers])

  const handleSelect = (user: User) => {
    onUserSelect(user)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder="Search users..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>
            {isLoading ? "Loading users..." : "No users found."}
          </CommandEmpty>
          <CommandGroup>
            {filteredUsers.map((user) => (
              <CommandItem
                key={user.user_id}
                value={user.user_id}
                onSelect={() => handleSelect(user)}
                className="flex flex-col items-start py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{user.display_name}</span>
                  <span className="text-sm text-muted-foreground capitalize">{user.role}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </DialogContent>
    </Dialog>
  )
} 