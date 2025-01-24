"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Message } from "@/app/types/message"
import { MessageItem } from "@/app/components/MessageItem"
import { useUser } from "@/app/hooks/useUser"

interface ViewChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  otherUserId: string
  customerId: string
  getUserDisplayName: (userId: string) => string
}

export function ViewChatModal({
  open,
  onOpenChange,
  otherUserId,
  customerId,
  getUserDisplayName,
}: ViewChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = createClientComponentClient()
  const { user } = useUser()

  useEffect(() => {
    const fetchMessages = async () => {
      // Determine which API route to use based on the user's role
      const apiRoute = user?.role === 'customer' 
        ? '/api/messages/customer' 
        : '/api/messages/employee'

      const response = await fetch(`${apiRoute}?other_user_id=${otherUserId}&customer_id=${customerId}`)
      if (!response.ok) {
        console.error('Error fetching messages')
        return
      }
      const data = await response.json()
      setMessages(data)
    }

    if (open) {
      fetchMessages()
    }
  }, [otherUserId, customerId, open, user?.role])

  // Empty functions for read-only view
  const handleEdit = () => {}
  const handleDelete = () => {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Chat History</h2>
          </div>
        </DialogHeader>
        <div className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              userId={customerId}
              getUserDisplayName={getUserDisplayName}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
} 