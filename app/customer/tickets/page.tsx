"use client"

import { useUser } from "@/app/hooks/useUser"
import { getSupabase } from "@/app/auth/supabase"
import { TicketsList } from "@/app/components/TicketsList"

export default function CustomerTickets() {
  const { user } = useUser()

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

  return <TicketsList fetchTickets={fetchTickets} title="My Tickets" />
} 