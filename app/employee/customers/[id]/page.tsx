"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@/app/hooks/useUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare, Ticket, AlertCircle } from 'lucide-react'
import { TicketsList } from '@/app/components/TicketsList'
import { CustomerProfile, CustomerChat } from '@/app/types/customer'
import { ViewChatModal } from '@/app/components/modals/ViewChatModal'
import { Ticket as TicketType } from '@/app/types/ticket'

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [chats, setChats] = useState<CustomerChat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<CustomerChat | null>(null)
  const [showChatModal, setShowChatModal] = useState(false)
  const supabase = createClientComponentClient()

  // Employee access check
  useEffect(() => {
    if (user && user.role === 'customer') {
      router.push('/')
    }
  }, [user, router])

  useEffect(() => {
    const fetchCustomer = async () => {
      // Fetch customer profile with counts
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, created_at')
        .eq('user_id', params.id)
        .single()

      if (profileError) {
        console.error('Error fetching customer:', profileError)
        return
      }

      const { data: totalTickets } = await supabase.rpc('get_total_tickets_count', { user_id: params.id })
      const { data: openTickets } = await supabase.rpc('get_open_tickets_count', { user_id: params.id })
      const { data: totalMessages } = await supabase.rpc('get_total_chat_messages_count', { user_id: params.id })
      const { data: unrespondedMessages } = await supabase.rpc('get_unresponded_chat_messages_count', { user_id: params.id })

      setCustomer({
        ...profileData,
        totalTickets: totalTickets || 0,
        openTickets: openTickets || 0,
        totalMessages: totalMessages || 0,
        unrespondedMessages: unrespondedMessages || 0,
      })

      // Fetch customer's chats
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${params.id},recipient_id.eq.${params.id}`)
        .order('created_at', { ascending: false })

      if (messages) {
        // Get unique user IDs from messages
        const uniqueUserIds = new Set<string>()
        messages.forEach(message => {
          const otherId = message.sender_id === params.id ? message.recipient_id : message.sender_id
          uniqueUserIds.add(otherId)
        })

        // Fetch user profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, role')
          .in('user_id', Array.from(uniqueUserIds))

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]))
          const chatMap = new Map<string, CustomerChat>()

          messages.forEach(message => {
            const otherId = message.sender_id === params.id ? message.recipient_id : message.sender_id
            const otherProfile = profileMap.get(otherId)
            
            if (otherProfile && (otherProfile.role === 'agent' || otherProfile.role === 'admin')) {
              if (!chatMap.has(otherId)) {
                chatMap.set(otherId, {
                  other_user: {
                    id: otherProfile.user_id,
                    display_name: otherProfile.display_name,
                    role: otherProfile.role,
                  },
                  latest_message: message,
                  total_messages: 1,
                })
              } else {
                const chat = chatMap.get(otherId)!
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

    fetchCustomer()

    // Set up realtime subscription for profile changes
    const channel = supabase.channel('customer-detail')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${params.id}`
        },
        fetchCustomer
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, params.id])

  const fetchCustomerTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('created_by', params.id)
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

  const handleChatClick = (chat: CustomerChat) => {
    if (chat.other_user.id === user?.id) {
      // If the current user is part of the chat, navigate to the chat page
      router.push(`/employee/chats/${customer?.user_id}`)
    } else {
      // Otherwise, show the chat modal
      setSelectedChat(chat)
      setShowChatModal(true)
    }
  }

  if (!user || user.role === 'customer') return null

  if (loading || !customer) {
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
        onClick={() => router.push('/employee/customers')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Customers
      </Button>

      {/* Customer Information Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                {customer.display_name || 'Unnamed Customer'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {customer.email}
              </p>
              <p className="text-sm text-muted-foreground">
                Customer since {new Date(customer.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">
                ID: {customer.user_id}
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
              <p className="text-2xl font-bold">{customer.totalTickets}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-red-500">
                <AlertCircle className="w-4 h-4 mr-1" /> Open Tickets
              </div>
              <p className="text-2xl font-bold text-red-500">{customer.openTickets}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 mr-1" /> Total Messages
              </div>
              <p className="text-2xl font-bold">{customer.totalMessages}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-red-500">
                <AlertCircle className="w-4 h-4 mr-1" /> Unresponded Messages
              </div>
              <p className="text-2xl font-bold text-red-500">{customer.unrespondedMessages}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tickets Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{customer.display_name}'s Tickets</h2>
            <Button onClick={() => router.push(`/employee/tickets/new?customer_id=${customer.user_id}`)}>
              <Ticket className="h-4 w-4 mr-2" />
              Create New Ticket
            </Button>
          </div>
          <TicketsList 
            fetchTickets={fetchCustomerTickets}
            title=""
            showSearch={false}
            showCreateTicket={false}
            subscriptionFilter={{
              column: 'created_by',
              value: customer.user_id
            }}
          />
        </div>

        {/* Chats Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{customer.display_name}'s Support Chats</h2>
            <Button 
              onClick={() => router.push(`/employee/chats/${customer.user_id}`)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with Customer
            </Button>
          </div>
          <div className="space-y-4 mt-12">
            {chats.map((chat) => (
              <Card 
                key={chat.other_user.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleChatClick(chat)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{chat.other_user.display_name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {chat.other_user.role}
                      </p>
                      {chat.latest_message && (
                        <p className="mt-2 text-sm text-muted-foreground truncate">
                          {chat.latest_message.message}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col items-end">
                      {chat.total_messages} messages
                      {chat.latest_message.sender_id == customer.user_id && (
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
          otherUserId={selectedChat.other_user.id}
          customerId={customer.user_id}
          getUserDisplayName={(id) => 
            id === selectedChat.other_user.id 
              ? selectedChat.other_user.display_name 
              : customer.display_name
          }
        />
      )}
    </div>
  )
} 