export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  seen: boolean
  created_at: string
  updated_at: string
}

export interface Conversation {
  other_user: {
    id: string
    display_name: string
    role: string
  }
  latest_message: Message | null
  unread_count: number
} 