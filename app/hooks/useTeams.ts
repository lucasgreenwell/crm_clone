import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TeamWithMembers } from '@/app/types/team'

export function useTeams() {
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    setLoading(true)
    
    // Initial fetch of teams with members and their profiles
    const fetchTeams = async () => {
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
          .order('name')

        if (error) throw error
        
        setTeams(data as TeamWithMembers[])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()

    // Set up realtime subscriptions
    const teamsSubscription = supabase
      .channel('teams-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teams'
      }, () => {
        fetchTeams()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members'
      }, () => {
        fetchTeams()
      })
      .subscribe()

    return () => {
      teamsSubscription.unsubscribe()
    }
  }, [supabase])

  return { teams, loading, error }
} 