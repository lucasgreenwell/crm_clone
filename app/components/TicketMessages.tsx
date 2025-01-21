import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUser } from "@/app/hooks/useUser"
import { Checkbox } from "@/components/ui/checkbox"
import { Pencil, Trash } from "lucide-react"
import { TicketMessage } from "@/app/types/ticket"

interface TicketMessagesProps {
  ticketId: string
  getUserDisplayName: (userId: string) => string
}

export function TicketMessages({ ticketId, getUserDisplayName }: TicketMessagesProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isInternalOnly, setIsInternalOnly] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

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

  const handleStartEdit = (message: TicketMessage) => {
    setEditingMessage(message.id)
    setEditValue(message.message)
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editValue.trim()) return

    try {
      const response = await fetch("/api/ticket-messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: messageId,
          message: editValue.trim(),
        }),
      })

      if (!response.ok) throw new Error("Failed to update message")

      setEditingMessage(null)
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

  const handleDelete = async (messageId: string) => {
    try {
      const response = await fetch(`/api/ticket-messages?id=${messageId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete message")

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.internal_only
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium">
                  {getUserDisplayName(message.sender_id)}
                </span>
                {message.internal_only && (
                  <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                    Internal Only
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {formatDate(message.created_at)}
                </span>
                {user?.id === message.sender_id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6"
                      onClick={() => handleStartEdit(message)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(message.id)}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {editingMessage === message.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="min-h-[100px]"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleSaveEdit(message.id)}
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditingMessage(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message here..."
          className="min-h-[100px]"
        />
        <div className="flex items-center justify-between">
          {user?.role !== 'customer' && (
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
          )}
          <Button type="submit" disabled={isSubmitting || !newMessage.trim()}>
            Send Message
          </Button>
        </div>
      </form>
    </div>
  )
} 