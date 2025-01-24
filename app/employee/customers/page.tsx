"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useUser } from '@/app/hooks/useUser'
import { Ticket, MessageCircle, AlertCircle } from 'lucide-react'

interface CustomerProfile {
  user_id: string
  display_name: string
  email: string
  created_at: string
  totalTickets: number
  openTickets: number
  totalMessages: number
  unrespondedMessages: number
}

export default function CustomersPage() {
  const router = useRouter()
  const { user } = useUser()
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Employee access check
  useEffect(() => {
    if (user && user.role === 'customer') {
      router.push('/')
    }
  }, [user, router])

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, created_at')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching customers:', error)
        return
      }

      const customersWithCounts = await Promise.all(data.map(async (customer) => {
        const { data: totalTickets } = await supabase.rpc('get_total_tickets_count', { user_id: customer.user_id })
        const { data: openTickets } = await supabase.rpc('get_open_tickets_count', { user_id: customer.user_id })
        const { data: totalMessages } = await supabase.rpc('get_total_chat_messages_count', { user_id: customer.user_id })
        const { data: unrespondedMessages } = await supabase.rpc('get_unresponded_chat_messages_count', { user_id: customer.user_id })
        console.log(customer.display_name, totalTickets, openTickets, totalMessages, unrespondedMessages)
        return {
          ...customer,
          totalTickets: totalTickets || 0,
          openTickets: openTickets || 0,
          totalMessages: totalMessages || 0,
          unrespondedMessages: unrespondedMessages || 0,
        }
      }))

      setCustomers(customersWithCounts)
      setLoading(false)
    }

    fetchCustomers()

    // Set up realtime subscription
    const channel = supabase.channel('customers-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.customer'
        },
        fetchCustomers
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase])

  if (!user || user.role === 'customer') return null

  if (loading) {
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
      <h1 className="text-3xl font-bold mb-6">Customers</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <Card 
            key={customer.user_id}
            className="cursor-pointer hover:border-primary/50 transition-transform transform hover:scale-105 shadow-lg rounded-lg bg-white"
            onClick={() => router.push(`/employee/customers/${customer.user_id}`)}
            data-testid="customer-card"
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{customer.display_name || 'Unnamed Customer'}</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                {customer.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Ticket className="w-4 h-4 mr-1" /> Total Tickets: {customer.totalTickets}
                </div>
                <div className="flex items-center text-sm text-red-500">
                  <AlertCircle className="w-4 h-4 mr-1" /> Open Tickets: {customer.openTickets}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MessageCircle className="w-4 h-4 mr-1" /> Total Messages: {customer.totalMessages}
                </div>
                <div className="flex items-center text-sm text-red-500">
                  <AlertCircle className="w-4 h-4 mr-1" /> Unresponded Messages: {customer.unrespondedMessages}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 