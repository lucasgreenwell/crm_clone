export interface TicketFilters {
  search?: string
  status?: 'open' | 'pending' | 'resolved' | 'closed'
  created_by?: string
  assigned_to?: string
}

export interface UserOption {
  id: string
  display_name: string | null
} 