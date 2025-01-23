"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/hooks/useUser'
import { useTeams } from '@/app/hooks/useTeams'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TeamsList } from '@/app/components/TeamsList'
import { CreateTeamModal } from '@/app/components/modals/CreateTeamModal'
import { OnCallSelection } from '@/app/components/OnCallSelection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ManagementPage() {
  const router = useRouter()
  const { user } = useUser()
  const { teams, loading, error } = useTeams()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Admin access check
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Management</h1>

      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>On-Call Management</CardTitle>
          </CardHeader>
          <CardContent>
            <OnCallSelection />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Teams</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      <TeamsList teams={teams} />

      <CreateTeamModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  )
} 