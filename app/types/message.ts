export interface Message {
  id: string
  sender_id?: string
  recipient_id?: string
  message: string
  content: string
  seen: boolean
  created_at: string
  updated_at: string
  is_ai: boolean
  user_id: string | null
  conversation_id?: string
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