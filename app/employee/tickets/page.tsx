"use client"

import { useUser } from "@/app/hooks/useUser"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { TicketsList } from "@/app/components/TicketsList"

export default function EmployeeTickets() {
  const { user } = useUser()
  const supabase = createClientComponentClient()

  const fetchTickets = async () => {
    if (!user) return []

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
      return []
    }

    return data || []
  }

  if (!user) return null

  return <TicketsList fetchTickets={fetchTickets} title="My Assigned Tickets" defaultAssignee={user.id} />
} 