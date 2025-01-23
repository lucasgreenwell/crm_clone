"use client"

import { TeamMember } from '@/app/types/team'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface TeamMembersListProps {
  teamId: string
  members: Array<TeamMember & {
    profile: {
      display_name: string
      role: string
    }
  }>
}

export function TeamMembersList({ teamId, members }: TeamMembersListProps) {
  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/teams/members?team_id=${teamId}&user_id=${userId}`,
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

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No members in this team</p>
    )
  }

  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <li
          key={member.user_id}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
        >
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {member.profile.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{member.profile.display_name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {member.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove member"
            onClick={() => handleRemoveMember(member.user_id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
} 