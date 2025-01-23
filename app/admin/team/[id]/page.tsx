"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/hooks/useUser'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TeamWithMembers } from '@/app/types/team'
import { Button } from '@/components/ui/button'
import { UserPlus, ArrowLeft, Pencil } from 'lucide-react'
import { UserSearchModal } from '@/app/components/modals/UserSearchModal'
import { TeamMembersList } from '@/app/components/TeamMembersList'
import { EditTeamModal } from '@/app/components/modals/EditTeamModal'

interface TeamDetailPageProps {
  params: {
    id: string
  }
}

export default function TeamDetailPage({ params }: TeamDetailPageProps) {
  const router = useRouter()
  const { user } = useUser()
  const [team, setTeam] = useState<TeamWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const supabase = createClientComponentClient()

  // Admin access check
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, router])

  const fetchTeam = async () => {
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
      
      setTeam(data as TeamWithMembers)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeam()

    // Set up realtime subscription
    const teamSubscription = supabase
      .channel('team-detail')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `id=eq.${params.id}`
      }, fetchTeam)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${params.id}`
      }, fetchTeam)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=in.(${team?.members.map(m => m.user_id).join(',') || ''})`
      }, fetchTeam)
      .subscribe()

    return () => {
      teamSubscription.unsubscribe()
    }
  }, [supabase, params.id, team?.members])

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
        onClick={() => router.push('/admin/teams')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Teams
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
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Team Members</h2>
        <TeamMembersList teamId={team.id} members={team.members} />
      </div>

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