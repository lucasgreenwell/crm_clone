"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TicketFeedback, Ticket } from "@/app/types/ticket"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TicketFeedbackModalProps {
  feedback: TicketFeedback
  open: boolean
  onOpenChange: (open: boolean) => void
  onFeedbackSubmitted: () => void
}

export function TicketFeedbackModal({
  feedback,
  open,
  onOpenChange,
  onFeedbackSubmitted,
}: TicketFeedbackModalProps) {
  const { toast } = useToast()
  const [rating, setRating] = useState<string>(feedback.rating?.toString() || "")
  const [feedbackText, setFeedbackText] = useState(feedback.feedback || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [assigneeName, setAssigneeName] = useState<string>("")
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadTicketDetails = async () => {
      // Fetch ticket details
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', feedback.ticket_id)
        .single()

      if (ticketError) {
        console.error('Error loading ticket:', ticketError)
        return
      }

      setTicket(ticketData)

      // If ticket has an assignee, fetch their name
      if (ticketData.assigned_to) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', ticketData.assigned_to)
          .single()

        if (userError) {
          console.error('Error loading assignee:', userError)
          return
        }

        setAssigneeName(userData.display_name || 'Unknown User')
      }
    }

    if (open) {
      loadTicketDetails()
    }
  }, [feedback.ticket_id, open, supabase])

  const handleSubmit = async () => {
    if (!rating) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/ticket-feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: feedback.id,
          rating: parseInt(rating),
          feedback: feedbackText,
        }),
      })

      if (!response.ok) throw new Error("Failed to submit feedback")

      toast({
        title: "Success",
        description: "Thank you for your feedback!",
      })
      onFeedbackSubmitted()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>How did we do?</DialogTitle>
          <DialogDescription className="space-y-2">
            {ticket && (
              <div className="mt-2">
                <p className="text-foreground">
                  How did {assigneeName || "our support team"} do at helping you with:
                </p>
                <p className="font-medium mt-1">
                  "{ticket.subject}"
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Your rating <span className="text-destructive">*</span>
            </label>
            <Select
              value={rating}
              onValueChange={setRating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Poor</SelectItem>
                <SelectItem value="2">2 - Fair</SelectItem>
                <SelectItem value="3">3 - Good</SelectItem>
                <SelectItem value="4">4 - Very Good</SelectItem>
                <SelectItem value="5">5 - Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              What could we have done better?
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Your feedback helps us improve our support..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            Submit Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 