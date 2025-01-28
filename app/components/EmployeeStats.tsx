"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Ticket, AlertCircle, Clock } from 'lucide-react'
import { TicketsList } from '@/app/components/TicketsList'
import { EmployeeProfile, EmployeeChat } from '@/app/types/employee'
import { ViewChatModal } from '@/app/components/modals/ViewChatModal'
import { Ticket as TicketType } from '@/app/types/ticket'
import { TicketCard } from '@/app/components/TicketCard'
import { useUser } from '@/app/hooks/useUser'

interface EmployeeStatsProps {
  employee: EmployeeProfile
  chats: EmployeeChat[]
  fetchTickets: () => Promise<TicketType[]>
  canModifyTickets?: boolean
}

export function EmployeeStats({ 
  employee, 
  chats,
  fetchTickets,
  canModifyTickets = false
}: EmployeeStatsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [selectedChat, setSelectedChat] = useState<EmployeeChat | null>(null)
  const [showChatModal, setShowChatModal] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketType[]>([])

  useEffect(() => {
    const loadTickets = async () => {
      const data = await fetchTickets()
      setTickets(data)
    }
    loadTickets()
  }, [fetchTickets])

  useEffect(() => {
    const ticketId = searchParams.get('ticket')
    if (ticketId) {
      const ticket = tickets.find(t => t.id === ticketId)
      if (ticket) {
        setViewingTicketId(ticketId)
      }
    } else {
      setViewingTicketId(null)
    }
  }, [searchParams, tickets])

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

  const handleChatClick = (chat: EmployeeChat) => {
    if (employee.user_id === user?.id) {
      // If the current user is the customer, navigate to the chat page
      router.push(`/employee/chats/${chat.customer.id}`)
    } else {
      // Otherwise, show the chat modal for viewing the chat
      setSelectedChat(chat)
      setShowChatModal(true)
    }
  }

  return (
    <>
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
            fetchTickets={fetchTickets}
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
                    canModifyTicket={canModifyTickets}
                    showCheckbox={false}
                    onTicketUpdated={() => {}}
                    getUserDisplayName={(id) => {
                      if (id === employee.user_id) return employee.display_name
                      return 'Unknown User'
                    }}
                    onClick={() => {
                      const newUrl = new URL(window.location.href)
                      newUrl.searchParams.set('ticket', ticket.id)
                      router.push(newUrl.pathname + newUrl.search)
                    }}
                    onClose={() => {
                      router.push(window.location.pathname)
                    }}
                    isViewing={viewingTicketId === ticket.id}
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
                onClick={() => handleChatClick(chat)}
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
          otherUserId={employee.user_id}
          customerId={selectedChat.customer.id}
          getUserDisplayName={(id) => 
            id === selectedChat.customer.id 
              ? selectedChat.customer.display_name 
              : employee.display_name
          }
        />
      )}
    </>
  )
} 