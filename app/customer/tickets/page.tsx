"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/app/hooks/useUser"
import { getSupabase } from "@/app/auth/supabase"
import { TicketsList } from "@/app/components/TicketsList"
import { TicketFeedback } from "@/app/types/ticket"
import { TicketFeedbackModal } from "@/app/components/modals/TicketFeedbackModal"

export default function CustomerTickets() {
  const { user } = useUser()
  const [pendingFeedback, setPendingFeedback] = useState<TicketFeedback | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  useEffect(() => {
    const checkForPendingFeedback = async () => {
      if (!user) return

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('ticket_feedback')
        .select('*')
        .is('rating', null)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error checking for pending feedback:', error)
        return
      }

      if (data && data.length > 0) {
        setPendingFeedback(data[0])
        setShowFeedbackModal(true)
      }
    }

    checkForPendingFeedback()
  }, [user])

  const fetchTickets = async () => {
    if (!user) return []

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
      return []
    }

    return data || []
  }

  if (!user) return null

  return (
    <>
      <TicketsList 
        fetchTickets={fetchTickets} 
        title="My Tickets" 
        subscriptionFilter={{
          column: 'created_by',
          value: user.id
        }}
      />

      {pendingFeedback && (
        <TicketFeedbackModal
          feedback={pendingFeedback}
          open={showFeedbackModal}
          onOpenChange={setShowFeedbackModal}
          onFeedbackSubmitted={() => {
            setPendingFeedback(null)
            setShowFeedbackModal(false)
          }}
        />
      )}
    </>
  )
} 