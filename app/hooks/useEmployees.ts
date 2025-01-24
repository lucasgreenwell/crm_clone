import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { EmployeeProfile } from '@/app/types/employee'

export function useEmployees() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  const fetchEmployees = async () => {
    try {
      // Fetch all users with agent or admin role
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['agent', 'admin'])
        .order('display_name')

      if (profileError) throw profileError

      // Fetch stats for each employee
      const employeesWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const [
            { data: avgRating },
            { data: totalTickets },
            { data: openTickets },
            { data: totalMessages },
            { data: unrespondedMessages },
            { data: avgResponseTime },
            { data: avgTicketCompletionTime }
          ] = await Promise.all([
            supabase.rpc('get_employee_average_rating', { employee_id: profile.user_id }),
            supabase.rpc('get_employee_total_tickets', { employee_id: profile.user_id }),
            supabase.rpc('get_employee_open_tickets', { employee_id: profile.user_id }),
            supabase.rpc('get_employee_total_messages', { employee_id: profile.user_id }),
            supabase.rpc('get_employee_unresponded_messages', { employee_id: profile.user_id }),
            supabase.rpc('get_employee_avg_response_time', { employee_id: profile.user_id }),
            supabase.rpc('get_employee_avg_ticket_completion_time', { employee_id: profile.user_id })
          ])

          return {
            ...profile,
            averageRating: avgRating || 0,
            totalTickets: totalTickets || 0,
            openTickets: openTickets || 0,
            totalMessages: totalMessages || 0,
            unrespondedMessages: unrespondedMessages || 0,
            avgResponseTime: avgResponseTime,
            avgTicketCompletionTime: avgTicketCompletionTime
          }
        })
      )

      setEmployees(employeesWithStats)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchEmployees()

    // Set up realtime subscriptions
    const channel = supabase.channel('employees-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: "role=in.(agent,admin)"
      }, () => {
        fetchEmployees()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase])

  return { employees, loading, error, refetch: fetchEmployees }
} 