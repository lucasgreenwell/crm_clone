"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@/app/hooks/useUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { TicketsList } from '@/app/components/TicketsList'

interface CustomerProfile {
  user_id: string
  display_name: string
  role: string
  created_at: string
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Employee access check
  useEffect(() => {
    if (user && user.role === 'customer') {
      router.push('/')
    }
  }, [user, router])

  useEffect(() => {
    const fetchCustomer = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', params.id)
        .single()

      if (error) {
        console.error('Error fetching customer:', error)
        return
      }

      setCustomer(data)
      setLoading(false)
    }

    fetchCustomer()

    // Set up realtime subscription
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
      return []
    }

    return data
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {customer.display_name || 'Unnamed Customer'}
          </h1>
          <p className="text-muted-foreground">
            Customer since {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button 
          onClick={() => router.push(`/employee/chats/${customer.user_id}`)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat with Customer
        </Button>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">ID:</span> {customer.user_id}
              </div>
              <div className="text-sm">
                <span className="font-medium">Role:</span> {customer.role}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TicketsList 
        fetchTickets={fetchCustomerTickets}
        title="Customer Tickets"
        subscriptionFilter={{
          column: 'created_by',
          value: customer.user_id
        }}
      />
    </div>
  )
} 