export interface Ticket {
    id: string
    subject: string
    description: string
    status: 'open' | 'pending' | 'resolved' | 'closed'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    channel: 'web' | 'email' | 'chat' | 'social' | 'sms' | 'phone'
    created_by: string
    assigned_to?: string
    team_id?: string
    created_at: string
    updated_at: string
}