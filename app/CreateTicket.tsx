"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export default function CreateTicket({ onTicketCreated }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      })

      if (!response.ok) {
        throw new Error("Failed to create ticket")
      }

      const newTicket = await response.json()
      onTicketCreated(newTicket)
      setTitle("")
      setDescription("")
      toast({
        title: "Success",
        description: "Ticket created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input placeholder="Ticket Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea
        placeholder="Ticket Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <Button type="submit">Create Ticket</Button>
    </form>
  )
}

