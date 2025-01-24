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
import { EmployeeProfile } from '@/app/types/employee'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function EmployeeCard({ employee, onCallChanged }: { 
  employee: EmployeeProfile
  onCallChanged: () => void 
}) {
  const router = useRouter()
  const supabase = createClientComponentClient()

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

  const handleSetOnCall = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (employee.is_oncall) return // If already on call, do nothing

      const response = await fetch('/api/oncall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: employee.user_id }),
      })

      if (!response.ok) throw new Error('Failed to update oncall status')
      onCallChanged()
    } catch (error) {
      console.error('Error updating on-call status:', error)
    }
  }

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-transform transform hover:scale-105 shadow-lg rounded-lg bg-white"
      onClick={() => router.push(`/admin/management/employee/${employee.user_id}`)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{employee.display_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {employee.email}
            </p>
            <p className="text-sm text-muted-foreground">
              Role: {employee.role}
            </p>
          </div>
          <Button
            variant={employee.is_oncall ? "default" : "outline"}
            size="sm"
            onClick={handleSetOnCall}
            className="gap-2"
          >
            <Phone className="h-4 w-4" />
            {employee.is_oncall ? 'On Call' : 'Set On Call'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Rating</p>
            <p className={`text-lg font-semibold ${getRatingColor(employee.averageRating)}`}>
              {employee.averageRating.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Open Tickets</p>
            <p className="text-lg font-semibold text-red-500">
              {employee.openTickets}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Response</p>
            <p className="text-lg font-semibold">
              {formatDuration(employee.avgResponseTime)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Resolution</p>
            <p className="text-lg font-semibold">
              {formatDuration(employee.avgTicketCompletionTime)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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