"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/hooks/useUser'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TeamWithMembers, TeamMember } from '@/app/types/team'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil } from 'lucide-react'
import { UserSearchModal } from '@/app/components/modals/UserSearchModal'
import { EditTeamModal } from '@/app/components/modals/EditTeamModal'
import { TeamStats } from '@/app/components/TeamStats'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface TeamDetailPageProps {
  params: {
    id: string
  }
}

interface ProfileRecord {
  user_id: string
  [key: string]: any
}

type ProfileChangesPayload = RealtimePostgresChangesPayload<ProfileRecord>

export default function TeamDetailPage({ params }: TeamDetailPageProps) {
  const router = useRouter()
  const { user } = useUser()
  const [team, setTeam] = useState<TeamWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const supabase = createClientComponentClient()
  const teamMembersRef = useRef<TeamMember[]>([])

  // Admin access check
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, router])

  const fetchTeam = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          members:team_members(
            *,
            profile:profiles(
              display_name,
              role
            )
          )
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      const teamData = data as TeamWithMembers
      setTeam(teamData)
      teamMembersRef.current = teamData.members
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, params.id])

  useEffect(() => {
    fetchTeam()

    // Set up realtime subscription
    const channel = supabase.channel('team-detail')

    // Subscribe to team changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'teams',
      filter: `id=eq.${params.id}`
    }, fetchTeam)

    // Subscribe to team member changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'team_members',
      filter: `team_id=eq.${params.id}`
    }, fetchTeam)

    // Subscribe to profile changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles'
    }, (payload: ProfileChangesPayload) => {
      const newProfile = payload.new as ProfileRecord
      // Only fetch if the changed profile is a team member
      if (teamMembersRef.current.some((member: TeamMember) => member.user_id === newProfile.user_id)) {
        fetchTeam()
      }
    })

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, params.id, fetchTeam])

  const handleAddMember = async (user: { user_id: string }) => {
    try {
      const response = await fetch('/api/teams/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: params.id,
          user_id: user.user_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add team member')
      }

      setIsAddMemberModalOpen(false)
    } catch (error) {
      console.error('Error adding team member:', error)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/teams/members?team_id=${params.id}&user_id=${userId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to remove team member')
      }
    } catch (error) {
      console.error('Error removing team member:', error)
    }
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading team details...</p>
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">
            {error ? error.message : 'Team not found'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push('/admin/management')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Admin Panel
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditModalOpen(true)}
              className="mb-2"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          {team.focus_area && (
            <p className="text-muted-foreground">{team.focus_area}</p>
          )}
        </div>
        <Button onClick={() => setIsAddMemberModalOpen(true)}>
          Add Member
        </Button>
      </div>

      <TeamStats team={team} onRemoveMember={handleRemoveMember} />

      <UserSearchModal
        open={isAddMemberModalOpen}
        onOpenChange={setIsAddMemberModalOpen}
        onUserSelect={handleAddMember}
        mode="team"
      />

      <EditTeamModal
        team={team}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  )
} 