export interface Ticket {
  id: string
  subject: string
  description: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_by: string
  assigned_to?: string
  team_id?: string
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  internal_only?: boolean
  created_at: string
  updated_at: string
}

export interface TicketFeedback {
  id: string
  ticket_id: string
  rating: number | null
  feedback: string | null
  created_by: string
  created_at: string
  updated_at: string
} 