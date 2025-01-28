import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Function to create a new ticket
export async function createTicket({
  subject,
  description,
  priority = 'low',
  status = 'open',
  channel = 'web',
  team_id = null,
  assigned_to = null,
}: {
  subject: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'open' | 'pending' | 'resolved' | 'closed'
  channel?: 'web' | 'email' | 'chat' | 'social' | 'sms' | 'phone'
  team_id?: string | null
  assigned_to?: string | null
}) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      subject,
      description,
      priority,
      status,
      channel,
      team_id,
      assigned_to,
      created_by: session.user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create ticket: ${error.message}`)
  }

  return ticket
}

// Function to update an existing ticket
export async function updateTicket({
  ticket_id,
  subject,
  description,
  priority,
  status,
  team_id,
  assigned_to,
}: {
  ticket_id: string
  subject?: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'open' | 'pending' | 'resolved' | 'closed'
  team_id?: string | null
  assigned_to?: string | null
}) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  // First check if the user has permission to update this ticket
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticket_id)
    .single()

  if (!ticket) {
    throw new Error("Ticket not found")
  }

  // Only allow updates if:
  // 1. User is an admin
  // 2. User is the assigned agent
  // 3. User is on the team the ticket is assigned to
  // 4. User is the creator of the ticket
  const canUpdate = 
    userProfile?.role === 'admin' ||
    ticket.assigned_to === session.user.id ||
    ticket.created_by === session.user.id ||
    (ticket.team_id && await isUserInTeam(session.user.id, ticket.team_id))

  if (!canUpdate) {
    throw new Error("You don't have permission to update this ticket")
  }

  const updateData: any = {}
  if (subject !== undefined) updateData.subject = subject
  if (description !== undefined) updateData.description = description
  if (priority !== undefined) updateData.priority = priority
  if (status !== undefined) updateData.status = status
  if (team_id !== undefined) updateData.team_id = team_id
  if (assigned_to !== undefined) updateData.assigned_to = assigned_to

  const { data: updatedTicket, error } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticket_id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update ticket: ${error.message}`)
  }

  return updatedTicket
}

// Helper function to check if a user is in a team
async function isUserInTeam(userId: string, teamId: string) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single()

  return !!data
}

// Function to delete a ticket
export async function deleteTicket(ticket_id: string) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  // Only admins can delete tickets
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  if (userProfile?.role !== 'admin') {
    throw new Error("Only administrators can delete tickets")
  }

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticket_id)

  if (error) {
    throw new Error(`Failed to delete ticket: ${error.message}`)
  }

  return { success: true, message: `Ticket ${ticket_id} deleted successfully` }
} 