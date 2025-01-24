import { Message } from "./message"
import { Ticket } from "./ticket"

export interface CustomerProfile {
  user_id: string
  display_name: string
  email: string
  created_at: string
  totalTickets: number
  openTickets: number
  totalMessages: number
  unrespondedMessages: number
  averageRating: number | null
}

export interface CustomerChat {
  other_user: {
    id: string
    display_name: string
    role: string
  }
  latest_message: Message
  total_messages: number
} 