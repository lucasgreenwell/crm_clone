"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/hooks/useUser'
import { useTeams } from '@/app/hooks/useTeams'
import { useEmployees } from '@/app/hooks/useEmployees'
import { Button } from '@/components/ui/button'
import { Plus, Phone } from 'lucide-react'
import { TeamsList } from '@/app/components/TeamsList'
import { CreateTeamModal } from '@/app/components/modals/CreateTeamModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { EmployeeCard } from '@/app/components/EmployeeCard'

export default function ManagementPage() {
  const router = useRouter()
  const { user } = useUser()
  const { teams, loading: teamsLoading, error: teamsError } = useTeams()
  const { employees, loading: employeesLoading, error: employeesError, refetch } = useEmployees()
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

  if (teamsLoading || employeesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (teamsError || employeesError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error: {teamsError?.message || employeesError?.message}</p>
        </div>
      </div>
    )
  }

  const onCallEmployee = employees.find(e => e.is_oncall)

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Management</h1>

      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>On-Call Status</CardTitle>
          </CardHeader>
          <CardContent>
            {onCallEmployee ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{onCallEmployee.display_name} is currently on call</span>
              </div>
            ) : (
              <span className="text-muted-foreground">No one is currently on call</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employees Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Support Staff</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => (
            <EmployeeCard 
              key={employee.user_id} 
              employee={employee} 
              onCallChanged={refetch}
            />
          ))}
        </div>
      </div>

      {/* Teams Section */}
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