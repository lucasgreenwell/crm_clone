"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/app/hooks/useUser"
import { getSupabase } from "@/app/auth/supabase"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Ticket } from "@/app/types/ticket"

export default function CustomerTickets() {
  const { user } = useUser()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tickets:', error)
        return
      }

      setTickets(data || [])
      setLoading(false)
    }

    fetchTickets()
  }, [user])

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <Link href="/customer/tickets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Ticket
          </Button>
        </Link>
      </div>

      {loading ? (
        <div>Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No tickets found</h3>
          <p className="text-muted-foreground mt-2">Create a new ticket to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 border rounded-lg hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticket.description}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize" 
                    style={{
                      backgroundColor: ticket.status === 'open' ? 'rgb(254 242 242)' : 
                        ticket.status === 'pending' ? 'rgb(254 249 195)' : 
                        ticket.status === 'resolved' ? 'rgb(220 252 231)' : 
                        'rgb(241 245 249)',
                      color: ticket.status === 'open' ? 'rgb(153 27 27)' : 
                        ticket.status === 'pending' ? 'rgb(161 98 7)' : 
                        ticket.status === 'resolved' ? 'rgb(22 101 52)' : 
                        'rgb(51 65 85)'
                    }}
                  >
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground mt-2">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 