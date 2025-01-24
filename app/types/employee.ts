import { Message } from "./message"
import { Ticket } from "./ticket"

export interface EmployeeProfile {
  user_id: string
  display_name: string
  email: string
  role: string
  created_at: string
  is_oncall: boolean
  averageRating: number
  totalTickets: number
  openTickets: number
  totalMessages: number
  unrespondedMessages: number
  avgResponseTime: string | null
  avgTicketCompletionTime: string | null
}

export interface EmployeeChat {
  customer: {
    id: string
    display_name: string
  }
  latest_message: Message
  total_messages: number
} 