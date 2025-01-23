"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUser } from "@/app/hooks/useUser"
import { MessageItem } from "@/app/components/MessageItem"
import { Message } from "@/app/types/message"

interface ChatMessagesProps {
  otherUserId: string
  getUserDisplayName: (userId: string) => string
}

export function ChatMessages({ otherUserId, getUserDisplayName }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useUser()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch(`/api/messages?other_user_id=${otherUserId}`)
      if (!response.ok) {
        console.error('Error fetching messages')
        return
      }
      const data = await response.json()
      setMessages(data)

      // Get IDs of unseen messages where user is recipient
      const unseenMessageIds = data
        .filter(message => !message.seen && message.recipient_id === user?.id)
        .map(message => message.id)

      // Update seen status if there are any unseen messages
      if (unseenMessageIds.length > 0) {
        try {
          await fetch('/api/messages/seen', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messageIds: unseenMessageIds }),
          })
        } catch (error) {
          console.error('Error updating seen status:', error)
        }
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Refetch messages to ensure we have the latest state
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [otherUserId, supabase, user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: otherUserId,
          message: newMessage.trim(),
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      setNewMessage("")
      toast({
        title: "Success",
        description: "Message sent successfully",
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (id: string, newMessage: string) => {
    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          message: newMessage,
        }),
      })

      if (!response.ok) throw new Error("Failed to update message")

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === id ? { ...msg, message: newMessage } : msg
        )
      )
      toast({
        title: "Success",
        description: "Message updated successfully",
      })
    } catch (error) {
      console.error('Error updating message:', error)
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/messages?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete message")

      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== id)
      )
      toast({
        title: "Success",
        description: "Message deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting message:', error)
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            userId={user?.id || ""}
            getUserDisplayName={getUserDisplayName}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message here..."
          className="min-h-[100px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !newMessage.trim()}>
            Send Message
          </Button>
        </div>
      </form>
    </div>
  )
} 