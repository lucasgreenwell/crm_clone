"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/app/hooks/useUser"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/app/components/Header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Ticket } from "@/app/types/ticket"

export default function Dashboard() {
  const { user, loading, fetchUser } = useUser()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (user) {
      fetchTickets()
    }
  }, [user])

  const fetchTickets = async () => {
    try {
      let query = supabase.from("tickets").select("*")

      if (!user) return;

      // For now, let's just fetch all tickets since we need to implement proper role-based filtering
      const { data, error } = await query

      if (error) throw error
      setTickets(data)
    } catch (error) {
      console.error("Error fetching tickets:", error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.filter((t) => t.status === "open").length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.filter((t) => t.status === "resolved").length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.5h</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recent">Recent Tickets</TabsTrigger>
            <TabsTrigger value="all">All Tickets</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="space-y-4">
            {tickets.slice(0, 5).map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">{ticket.description}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant={ticket.status === "open" ? "default" : "secondary"}>{ticket.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Created on {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tickets.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tickets found.</p>
                  <Button>Create a New Ticket</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="all" className="space-y-4">
            {/* We'll implement pagination or infinite scroll here in the future */}
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">{ticket.description}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant={ticket.status === "open" ? "default" : "secondary"}>{ticket.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Created on {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tickets.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tickets found.</p>
                  <Button>Create a New Ticket</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

