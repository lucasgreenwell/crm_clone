"use client"

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, X } from 'lucide-react'
import { EmployeeProfile } from '@/app/types/employee'

interface EmployeeCardProps {
  employee: EmployeeProfile
  showOnCallButton?: boolean
  onCallChanged?: () => void
  onRemove?: () => void
}

export function EmployeeCard({ 
  employee, 
  showOnCallButton = true,
  onCallChanged,
  onRemove
}: EmployeeCardProps) {
  const router = useRouter()

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
      onCallChanged?.()
    } catch (error) {
      console.error('Error updating on-call status:', error)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove?.()
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
          <div className="flex gap-2">
            {showOnCallButton && (
              <Button
                variant={employee.is_oncall ? "default" : "outline"}
                size="sm"
                onClick={handleSetOnCall}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                {employee.is_oncall ? 'On Call' : 'Set On Call'}
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
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