"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@/app/hooks/useUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare, Ticket, AlertCircle, Clock } from 'lucide-react'
import { TicketsList } from '@/app/components/TicketsList'
import { EmployeeProfile, EmployeeChat } from '@/app/types/employee'
import { ViewChatModal } from '@/app/components/modals/ViewChatModal'
import { Ticket as TicketType } from '@/app/types/ticket'
import { TicketCard } from '@/app/components/TicketCard'

export default function EmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null)
  const [chats, setChats] = useState<EmployeeChat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<EmployeeChat | null>(null)
  const [showChatModal, setShowChatModal] = useState(false)
  const supabase = createClientComponentClient()

  // Admin access check
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, router])

  useEffect(() => {
    const fetchEmployee = async () => {
      // Fetch employee profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', params.id)
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
        supabase.rpc('get_employee_average_rating', { employee_id: params.id }),
        supabase.rpc('get_employee_total_tickets', { employee_id: params.id }),
        supabase.rpc('get_employee_open_tickets', { employee_id: params.id }),
        supabase.rpc('get_employee_total_messages', { employee_id: params.id }),
        supabase.rpc('get_employee_unresponded_messages', { employee_id: params.id }),
        supabase.rpc('get_employee_avg_response_time', { employee_id: params.id }),
        supabase.rpc('get_employee_avg_ticket_completion_time', { employee_id: params.id })
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
        .or(`sender_id.eq.${params.id},recipient_id.eq.${params.id}`)
        .order('created_at', { ascending: false })

      if (messages) {
        // Get unique customer IDs from messages
        const uniqueCustomerIds = new Set<string>()
        messages.forEach(message => {
          const customerId = message.sender_id === params.id ? message.recipient_id : message.sender_id
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
            const customerId = message.sender_id === params.id ? message.recipient_id : message.sender_id
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

    fetchEmployee()

    // Set up realtime subscription for profile changes
    const channel = supabase.channel('employee-detail')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${params.id}`
        },
        fetchEmployee
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, params.id])

  const fetchEmployeeTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_feedback (
          rating
        )
      `)
      .eq('assigned_to', params.id)
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

  const getRatingColor = (rating: number) => {
    if (rating > 3.5) return 'text-green-500'
    if (rating >= 2) return 'text-yellow-500'
    return 'text-red-500'
  }

  const formatDuration = (duration: string | null) => {
    if (!duration) return 'N/A'
    // Convert PostgreSQL interval to hours, minutes and seconds
    const match = duration.match(/(\d+):(\d+):(\d+)/)
    if (!match) return duration
    const [_, hours, minutes, seconds] = match
    if (hours === '00' && minutes === '00') {
      return `${seconds}s`
    }
    if (hours === '00') {
      return `${parseInt(minutes)}m ${seconds}s`
    }
    return `${parseInt(hours)}h ${minutes}m`
  }

  if (!user || user.role !== 'admin') return null

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
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push('/admin/management')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Management
      </Button>

      {/* Employee Information Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                {employee.display_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {employee.email}
              </p>
              <p className="text-sm text-muted-foreground">
                Role: {employee.role}
              </p>
              <p className="text-sm text-muted-foreground">
                Employee since {new Date(employee.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Ticket className="w-4 h-4 mr-1" /> Total Tickets
              </div>
              <p className="text-2xl font-bold">{employee.totalTickets}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-red-500">
                <AlertCircle className="w-4 h-4 mr-1" /> Open Tickets
              </div>
              <p className="text-2xl font-bold text-red-500">{employee.openTickets}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <MessageSquare className="w-4 w-4 mr-1" /> Total Messages
              </div>
              <p className="text-2xl font-bold">{employee.totalMessages}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-red-500">
                <AlertCircle className="w-4 h-4 mr-1" /> Unresponded Messages
              </div>
              <p className="text-2xl font-bold text-red-500">{employee.unrespondedMessages}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                Average Rating
              </div>
              <p className={`text-2xl font-bold ${getRatingColor(employee.averageRating)}`}>
                {employee.averageRating.toFixed(1)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" /> Avg Response Time
              </div>
              <p className="text-2xl font-bold">
                {formatDuration(employee.avgResponseTime)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" /> Avg Ticket Time
              </div>
              <p className="text-2xl font-bold">
                {formatDuration(employee.avgTicketCompletionTime)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tickets Column */}
        <div>
          <h2 className="text-xl font-bold mb-4">Assigned Tickets</h2>
          <TicketsList 
            fetchTickets={fetchEmployeeTickets}
            title=""
            showSearch={false}
            showCreateTicket={false}
            subscriptionFilter={{
              column: 'assigned_to',
              value: employee.user_id
            }}
            renderTicket={(ticket: TicketType) => (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <TicketCard
                    ticket={ticket}
                    canModifyTicket={false}
                    showCheckbox={false}
                    onTicketUpdated={() => {}}
                    getUserDisplayName={(id) => {
                      if (id === employee.user_id) return employee.display_name
                      return 'Unknown User'
                    }}
                  />
                </div>
                {(ticket.status === 'closed' || ticket.status === 'resolved') && 
                 ticket.ticket_feedback?.rating && (
                  <div className={`flex items-center ${getRatingColor(ticket.ticket_feedback.rating)}`}>
                    <span className="text-lg font-semibold">
                      {ticket.ticket_feedback.rating}/5
                    </span>
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* Chats Column */}
        <div>
          <h2 className="text-xl font-bold mb-4">Customer Chats</h2>
          <div className="space-y-4 mt-12">
            {chats.map((chat) => (
              <Card 
                key={chat.customer.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedChat(chat)
                  setShowChatModal(true)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{chat.customer.display_name}</h3>
                      {chat.latest_message && (
                        <p className="mt-2 text-sm text-muted-foreground truncate">
                          {chat.latest_message.message}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col items-end">
                      {chat.total_messages} messages
                      {chat.latest_message.recipient_id === employee.user_id && (
                        <span className="text-red-500 mt-6">• Unresponded</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {selectedChat && (
        <ViewChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          otherUserId={selectedChat.customer.id}
          customerId={selectedChat.customer.id}
          getUserDisplayName={(id) => 
            id === selectedChat.customer.id 
              ? selectedChat.customer.display_name 
              : employee.display_name
          }
        />
      )}
    </div>
  )
} 