"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TeamWithMembers, UpdateTeamRequest } from '@/app/types/team'

interface EditTeamModalProps {
  team: TeamWithMembers
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTeamModal({ team, open, onOpenChange }: EditTeamModalProps) {
  const [formData, setFormData] = useState<UpdateTeamRequest>({
    id: team.id,
    name: team.name,
    focus_area: team.focus_area || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFormData({
      id: team.id,
      name: team.name,
      focus_area: team.focus_area || '',
    })
  }, [team])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update team')
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error updating team:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter team name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="focus_area">Focus Area</Label>
            <Textarea
              id="focus_area"
              value={formData.focus_area}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, focus_area: e.target.value }))
              }
              placeholder="Enter team's focus area"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 