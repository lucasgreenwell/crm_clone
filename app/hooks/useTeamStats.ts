import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface TeamStats {
  total_tickets: number
  open_tickets: number
  total_messages: number
  unresponded_messages: number
  average_rating: number
  avg_response_time: string | null
  avg_ticket_completion_time: string | null
}

export function useTeamStats(teamId: string) {
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // First get all team members
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamId)

        if (membersError) throw membersError
        if (!members.length) {
          setStats({
            total_tickets: 0,
            open_tickets: 0,
            total_messages: 0,
            unresponded_messages: 0,
            average_rating: 0,
            avg_response_time: null,
            avg_ticket_completion_time: null
          })
          setLoading(false)
          return
        }

        // Fetch stats for each member
        const memberStats = await Promise.all(
          members.map(async (member) => {
            const [
              { data: avgRating },
              { data: totalTickets },
              { data: openTickets },
              { data: totalMessages },
              { data: unrespondedMessages },
              { data: avgResponseTime },
              { data: avgTicketCompletionTime }
            ] = await Promise.all([
              supabase.rpc('get_employee_average_rating', { employee_id: member.user_id }),
              supabase.rpc('get_employee_total_tickets', { employee_id: member.user_id }),
              supabase.rpc('get_employee_open_tickets', { employee_id: member.user_id }),
              supabase.rpc('get_employee_total_messages', { employee_id: member.user_id }),
              supabase.rpc('get_employee_unresponded_messages', { employee_id: member.user_id }),
              supabase.rpc('get_employee_avg_response_time', { employee_id: member.user_id }),
              supabase.rpc('get_employee_avg_ticket_completion_time', { employee_id: member.user_id })
            ])

            return {
              avgRating: avgRating || 0,
              totalTickets: totalTickets || 0,
              openTickets: openTickets || 0,
              totalMessages: totalMessages || 0,
              unrespondedMessages: unrespondedMessages || 0,
              avgResponseTime,
              avgTicketCompletionTime
            }
          })
        )

        // Aggregate stats
        const aggregatedStats = memberStats.reduce((acc, curr) => {
          return {
            total_tickets: acc.total_tickets + curr.totalTickets,
            open_tickets: acc.open_tickets + curr.openTickets,
            total_messages: acc.total_messages + curr.totalMessages,
            unresponded_messages: acc.unresponded_messages + curr.unrespondedMessages,
            // For average rating, we'll keep track of sum and count
            rating_sum: acc.rating_sum + curr.avgRating,
            rating_count: acc.rating_count + (curr.avgRating > 0 ? 1 : 0),
            // For response and completion times, we'll collect all non-null values
            response_times: curr.avgResponseTime ? [...acc.response_times, curr.avgResponseTime] : acc.response_times,
            completion_times: curr.avgTicketCompletionTime ? [...acc.completion_times, curr.avgTicketCompletionTime] : acc.completion_times,
          }
        }, {
          total_tickets: 0,
          open_tickets: 0,
          total_messages: 0,
          unresponded_messages: 0,
          rating_sum: 0,
          rating_count: 0,
          response_times: [] as string[],
          completion_times: [] as string[],
        })

        // Calculate averages
        const averageRating = aggregatedStats.rating_count > 0 
          ? aggregatedStats.rating_sum / aggregatedStats.rating_count 
          : 0

        // Helper function to average intervals
        const averageIntervals = (intervals: string[]) => {
          if (intervals.length === 0) return null
          
          // Convert all intervals to seconds
          const secondsArray = intervals.map(interval => {
            const match = interval.match(/(\d+):(\d+):(\d+)/)
            if (!match) return 0
            const [_, hours, minutes, seconds] = match
            return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)
          })

          // Calculate average seconds
          const avgSeconds = secondsArray.reduce((a, b) => a + b, 0) / secondsArray.length

          // Convert back to interval format
          const hours = Math.floor(avgSeconds / 3600)
          const minutes = Math.floor((avgSeconds % 3600) / 60)
          const seconds = Math.floor(avgSeconds % 60)
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }

        setStats({
          total_tickets: aggregatedStats.total_tickets,
          open_tickets: aggregatedStats.open_tickets,
          total_messages: aggregatedStats.total_messages,
          unresponded_messages: aggregatedStats.unresponded_messages,
          average_rating: averageRating,
          avg_response_time: averageIntervals(aggregatedStats.response_times),
          avg_ticket_completion_time: averageIntervals(aggregatedStats.completion_times)
        })
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Set up realtime subscriptions for relevant tables
    const channel = supabase.channel('team-stats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${teamId}`
      }, fetchStats)
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [teamId, supabase])

  return { stats, loading, error }
} 