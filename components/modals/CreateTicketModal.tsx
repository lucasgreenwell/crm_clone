"use client"

import { useState } from "react"
import { useUser } from "@/app/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import type { Ticket } from "@/app/types/ticket"

type Priority = Ticket["priority"]
type Channel = Ticket["channel"]

interface CreateTicketModalProps {
  onTicketCreated?: (ticket: Ticket) => void
  trigger?: React.ReactNode
}

export function CreateTicketModal({ onTicketCreated, trigger }: CreateTicketModalProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "low" as Priority,
    channel: "web" as Channel,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          created_by: user.id,
          status: "open",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create ticket")
      }

      const newTicket = await response.json()
      
      toast({
        title: "Success",
        description: "Ticket created successfully!",
      })
      
      if (onTicketCreated) {
        onTicketCreated(newTicket)
      }
      
      setOpen(false)
      setFormData({
        subject: "",
        description: "",
        priority: "low",
        channel: "web",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Create Ticket</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new support ticket.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject
            </label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              required
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="text-sm font-medium">
              Priority
            </label>
            <Select
              value={formData.priority}
              onValueChange={(value: Priority) =>
                setFormData((prev) => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Ticket"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 