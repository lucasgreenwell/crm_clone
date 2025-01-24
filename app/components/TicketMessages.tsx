"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUser } from "@/app/hooks/useUser"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageItem } from "@/app/components/MessageItem"
import { TicketMessage } from "@/app/types/ticket"
import { TemplateSelector } from "@/app/components/TemplateSelector"
import { extractTemplateVariables } from "@/app/types/template"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TicketMessagesProps {
  ticketId: string
  getUserDisplayName: (userId: string) => string
}

export function TicketMessages({ ticketId, getUserDisplayName }: TicketMessagesProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isInternalOnly, setIsInternalOnly] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wasTemplateUsed, setWasTemplateUsed] = useState(false)
  const [showVariableWarning, setShowVariableWarning] = useState(false)
  const { toast } = useToast()
  const { user } = useUser()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      setMessages(data || [])
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`ticket_messages:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, supabase])

  const handleTemplateSelect = (content: string) => {
    setNewMessage(content)
    setWasTemplateUsed(true)
  }

  const checkForUnreplacedVariables = (message: string): boolean => {
    if (!wasTemplateUsed) return false
    return extractTemplateVariables(message).length > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    // Check for unreplaced variables if a template was used
    if (checkForUnreplacedVariables(newMessage)) {
      setShowVariableWarning(true)
      return
    }

    await sendMessage()
  }

  const sendMessage = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/ticket-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          message: newMessage.trim(),
          internal_only: isInternalOnly,
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      setNewMessage("")
      setIsInternalOnly(false)
      setWasTemplateUsed(false)
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
      const response = await fetch("/api/ticket-messages", {
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
      const response = await fetch(`/api/ticket-messages?id=${id}`, {
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
    <>
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
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                }
              }}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {user?.role !== 'customer' && (
            <div className="flex items-center justify-between">
              <TemplateSelector onSelect={handleTemplateSelect} />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internal"
                  checked={isInternalOnly}
                  onCheckedChange={(checked) => setIsInternalOnly(checked as boolean)}
                />
                <label
                  htmlFor="internal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Internal message (hidden from customer)
                </label>
              </div>
            </div>
          )}
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message here..."
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !newMessage.trim()}>
              Send Message
            </Button>
          </div>
        </form>
      </div>

      <AlertDialog open={showVariableWarning} onOpenChange={setShowVariableWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unreplaced Template Variables</AlertDialogTitle>
            <AlertDialogDescription>
              Your message contains template variables that haven't been replaced. Are you sure you want to send it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={sendMessage}>
              Send Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 