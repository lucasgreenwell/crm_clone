"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Ticket, AlertCircle, Clock } from 'lucide-react'
import { useTeamStats } from '@/app/hooks/useTeamStats'
import { TeamWithMembers, TeamMember } from '@/app/types/team'
import { EmployeeCard } from '@/app/components/EmployeeCard'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { EmployeeProfile } from '@/app/types/employee'

interface TeamStatsProps {
  team: TeamWithMembers
  onRemoveMember: (userId: string) => Promise<void>
}

export function TeamStats({ team, onRemoveMember }: TeamStatsProps) {
  const { stats, loading, error } = useTeamStats(team.id)
  const [memberStats, setMemberStats] = useState<Record<string, EmployeeProfile>>({})
  const [loadingMembers, setLoadingMembers] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchMemberStats = async () => {
      setLoadingMembers(true)
      const memberStatsMap: Record<string, EmployeeProfile> = {}

      await Promise.all(
        team.members.map(async (member: TeamMember) => {
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

          memberStatsMap[member.user_id] = {
            ...member.profile,
            user_id: member.user_id,
            email: '', // We don't have this in the current data structure
            role: member.role,
            is_oncall: false, // We don't have this in the current data structure
            created_at: member.created_at,
            totalTickets: totalTickets || 0,
            openTickets: openTickets || 0,
            totalMessages: totalMessages || 0,
            unrespondedMessages: unrespondedMessages || 0,
            averageRating: avgRating || 0,
            avgResponseTime,
            avgTicketCompletionTime
          }
        })
      )

      setMemberStats(memberStatsMap)
      setLoadingMembers(false)
    }

    fetchMemberStats()
  }, [team.members, supabase])

  const getRatingColor = (rating: number) => {
    if (rating > 3.5) return 'text-green-500'
    if (rating >= 2) return 'text-yellow-500'
    return 'text-red-500'
  }

  const formatDuration = (duration: string | null) => {
    if (!duration) return 'N/A'
    // Convert PostgreSQL interval to hours, minutes and seconds
    const match = duration.match(/(\d+):(\d+):(\d+)/)
    if (!match) return duration
    const [_, hours, minutes, seconds] = match
    if (hours === '00' && minutes === '00') {
      return `${seconds}s`
    }
    if (hours === '00') {
      return `${parseInt(minutes)}m ${seconds}s`
    }
    return `${parseInt(hours)}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">Loading team statistics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-destructive">Error loading team statistics</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8">
      {/* Team Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Ticket className="w-4 h-4 mr-1" /> Total Tickets
              </div>
              <p className="text-2xl font-bold">{stats.total_tickets}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-red-500">
                <AlertCircle className="w-4 h-4 mr-1" /> Open Tickets
              </div>
              <p className="text-2xl font-bold text-red-500">{stats.open_tickets}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <MessageSquare className="w-4 w-4 mr-1" /> Total Messages
              </div>
              <p className="text-2xl font-bold">{stats.total_messages}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-red-500">
                <AlertCircle className="w-4 h-4 mr-1" /> Unresponded Messages
              </div>
              <p className="text-2xl font-bold text-red-500">{stats.unresponded_messages}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                Average Rating
              </div>
              <p className={`text-2xl font-bold ${getRatingColor(stats.average_rating)}`}>
                {stats.average_rating.toFixed(1)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" /> Avg Response Time
              </div>
              <p className="text-2xl font-bold">
                {formatDuration(stats.avg_response_time)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" /> Avg Ticket Time
              </div>
              <p className="text-2xl font-bold">
                {formatDuration(stats.avg_ticket_completion_time)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Team Members</h2>
        {loadingMembers ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading member statistics...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {team.members.map((member: TeamMember) => (
              <EmployeeCard
                key={member.user_id}
                employee={memberStats[member.user_id]}
                showOnCallButton={false}
                onRemove={() => onRemoveMember(member.user_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 