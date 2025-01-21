"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/app/hooks/useUser"
import { getSupabase } from "@/app/auth/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

type Priority = "low" | "medium" | "high" | "urgent"
type Channel = "web" | "email" | "chat" | "social" | "sms" | "phone"

export default function NewTicket() {
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
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
    const supabase = getSupabase()

    const { error } = await supabase.from("tickets").insert([
      {
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        channel: formData.channel,
        status: "open",
        created_by: user.id,
      },
    ])

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Success",
      description: "Ticket created successfully!",
    })
    router.push("/customer/tickets")
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Ticket</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
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

        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Ticket"}
        </Button>
      </form>
    </div>
  )
} 