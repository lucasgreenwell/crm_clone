import { Database } from '@/lib/database.types'

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']
export type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update']

export type TeamWithMembers = Team & {
  members: Array<TeamMember & {
    profile: {
      display_name: string
      role: string
    }
  }>
}

export type CreateTeamRequest = {
  name: string
  focus_area?: string
}

export type UpdateTeamRequest = {
  id: string
  name?: string
  focus_area?: string
}

export type AddTeamMemberRequest = {
  team_id: string
  user_id: string
  role?: 'manager' | 'member'
}

export type RemoveTeamMemberRequest = {
  team_id: string
  user_id: string
} 