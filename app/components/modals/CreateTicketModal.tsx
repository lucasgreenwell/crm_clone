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
  trigger?: React.ReactNode
  onTicketCreated?: (ticket: Ticket) => void
  defaultAssignee?: string
}

export function CreateTicketModal({ trigger, onTicketCreated, defaultAssignee }: CreateTicketModalProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("low")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          description,
          priority,
          status: "open",
          channel: "web",
          created_by: user.id,
          assigned_to: defaultAssignee,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create ticket")
      }

      const ticket = await response.json()
      toast({
        title: "Success",
        description: "Ticket created successfully!",
      })
      onTicketCreated?.(ticket)
      setOpen(false)
      setSubject("")
      setDescription("")
      setPriority("low")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
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
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => e.preventDefault()}>
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
              name="subject"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              aria-required="true"
              data-testid="subject-input"
            />
            {subject === "" && (
              <p className="text-sm text-destructive" data-testid="subject-error">
                This field is required
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              aria-required="true"
              data-testid="description-input"
              className="min-h-[150px]"
            />
            {description === "" && (
              <p className="text-sm text-destructive" data-testid="description-error">
                This field is required
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="text-sm font-medium">
              Priority
            </label>
            <Select
              value={priority}
              onValueChange={setPriority}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
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