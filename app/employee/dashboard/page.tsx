"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@/app/hooks/useUser'
import { EmployeeProfile, EmployeeChat } from '@/app/types/employee'
import { Ticket as TicketType } from '@/app/types/ticket'
import { EmployeeStats } from '@/app/components/EmployeeStats'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null)
  const [chats, setChats] = useState<EmployeeChat[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user && user.role === 'customer') {
      router.push('/')
    }
  }, [user, router])

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user) return

      // Fetch employee profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching employee:', profileError)
        return
      }

      // Fetch all stats
      const [
        { data: avgRating },
        { data: totalTickets },
        { data: openTickets },
        { data: totalMessages },
        { data: unrespondedMessages },
        { data: avgResponseTime },
        { data: avgTicketCompletionTime }
      ] = await Promise.all([
        supabase.rpc('get_employee_average_rating', { employee_id: user.id }),
        supabase.rpc('get_employee_total_tickets', { employee_id: user.id }),
        supabase.rpc('get_employee_open_tickets', { employee_id: user.id }),
        supabase.rpc('get_employee_total_messages', { employee_id: user.id }),
        supabase.rpc('get_employee_unresponded_messages', { employee_id: user.id }),
        supabase.rpc('get_employee_avg_response_time', { employee_id: user.id }),
        supabase.rpc('get_employee_avg_ticket_completion_time', { employee_id: user.id })
      ])

      setEmployee({
        ...profile,
        averageRating: avgRating || 0,
        totalTickets: totalTickets || 0,
        openTickets: openTickets || 0,
        totalMessages: totalMessages || 0,
        unrespondedMessages: unrespondedMessages || 0,
        avgResponseTime: avgResponseTime,
        avgTicketCompletionTime: avgTicketCompletionTime
      })

      // Fetch employee's chats
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (messages) {
        // Get unique customer IDs from messages
        const uniqueCustomerIds = new Set<string>()
        messages.forEach(message => {
          const customerId = message.sender_id === user.id ? message.recipient_id : message.sender_id
          uniqueCustomerIds.add(customerId)
        })

        // Fetch customer profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, role')
          .in('user_id', Array.from(uniqueCustomerIds))
          .eq('role', 'customer')

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]))
          const chatMap = new Map<string, EmployeeChat>()

          messages.forEach(message => {
            const customerId = message.sender_id === user.id ? message.recipient_id : message.sender_id
            const customerProfile = profileMap.get(customerId)
            
            if (customerProfile) {
              if (!chatMap.has(customerId)) {
                chatMap.set(customerId, {
                  customer: {
                    id: customerProfile.user_id,
                    display_name: customerProfile.display_name,
                  },
                  latest_message: message,
                  total_messages: 1,
                })
              } else {
                const chat = chatMap.get(customerId)!
                if (message.created_at > chat.latest_message.created_at) {
                  chat.latest_message = message
                }
                chat.total_messages++
              }
            }
          })

          setChats(Array.from(chatMap.values()))
        }
      }

      setLoading(false)
    }

    fetchEmployeeData()

    // Set up realtime subscription for profile changes
    const channel = supabase.channel('employee-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user?.id}`
        },
        fetchEmployeeData
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, user])

  const fetchEmployeeTickets = async () => {
    if (!user) return []
    
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_feedback (
          rating
        )
      `)
      .eq('assigned_to', user.id)
      .order('status', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
      return []
    }

    // Custom sort order: open, pending, resolved, closed
    const statusOrder = { open: 0, pending: 1, resolved: 2, closed: 3 }
    return data.sort((a: TicketType, b: TicketType) => 
      statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
    )
  }

  if (!user || user.role === 'customer') return null

  if (loading || !employee) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <EmployeeStats
        employee={employee}
        chats={chats}
        fetchTickets={fetchEmployeeTickets}
        canModifyTickets={true}
      />
    </div>
  )
}

