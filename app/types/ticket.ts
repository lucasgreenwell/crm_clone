export interface Ticket {
  id: string
  created_by: string
  assigned_to: string | null
  team_id: string | null
  subject: string
  description: string | null
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  channel: 'web' | 'email' | 'chat' | 'social' | 'sms' | 'phone'
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  internal_only: boolean
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