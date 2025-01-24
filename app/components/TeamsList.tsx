"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TeamWithMembers } from '@/app/types/team'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, UserPlus } from 'lucide-react'
import { EditTeamModal } from '@/app/components/modals/EditTeamModal'
import { UserSearchModal } from '@/app/components/modals/UserSearchModal'
import { TeamMembersList } from '@/app/components/TeamMembersList'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface TeamsListProps {
  teams: TeamWithMembers[]
}

export function TeamsList({ teams }: TeamsListProps) {
  const router = useRouter()
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<TeamWithMembers | null>(null)

  const handleDeleteTeam = async (team: TeamWithMembers) => {
    try {
      const response = await fetch(`/api/teams?id=${team.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete team')
      }

      setShowDeleteDialog(false)
      setTeamToDelete(null)
    } catch (error) {
      console.error('Error deleting team:', error)
    }
  }

  const handleAddMember = async (user: { user_id: string }) => {
    if (!selectedTeam) return

    try {
      const response = await fetch('/api/teams/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: selectedTeam.id,
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

  const handleCardClick = (e: React.MouseEvent, team: TeamWithMembers) => {
    // Check if click was on a button or its children
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    router.push(`/admin/team/${team.id}`)
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Card 
          key={team.id} 
          className="cursor-pointer hover:border-primary/50 transition-transform transform hover:scale-105 shadow-lg rounded-lg bg-white"
          onClick={(e) => handleCardClick(e, team)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{team.name}</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit team"
                  onClick={() => {
                    setSelectedTeam(team)
                    setIsEditModalOpen(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete team"
                  onClick={() => {
                    setTeamToDelete(team)
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {team.focus_area && (
              <CardDescription>{team.focus_area}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Team Members</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Add team member"
                  onClick={() => {
                    setSelectedTeam(team)
                    setIsAddMemberModalOpen(true)
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
              <TeamMembersList teamId={team.id} members={team.members} />
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedTeam && (
        <>
          <EditTeamModal
            team={selectedTeam}
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
          />
          <UserSearchModal
            open={isAddMemberModalOpen}
            onOpenChange={setIsAddMemberModalOpen}
            onUserSelect={handleAddMember}
            mode="team"
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this team? This action will remove all team members and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => teamToDelete && handleDeleteTeam(teamToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 