"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from '@/components/ui/use-toast'

interface Employee {
  user_id: string
  display_name: string
  is_oncall: boolean
}

export function OnCallSelection() {
  const [open, setOpen] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, is_oncall')
        .in('role', ['agent', 'admin'])
        .order('display_name')

      if (error) {
        console.error('Error fetching employees:', error)
        return
      }

      setEmployees(data)
      const oncallEmployee = data.find(emp => emp.is_oncall)
      if (oncallEmployee) {
        setSelectedEmployee(oncallEmployee)
      }
    }

    fetchEmployees()

    // Subscribe to changes
    const channel = supabase
      .channel('profiles-oncall')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: 'is_oncall=true'
      }, () => {
        fetchEmployees()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleSelect = async (employee: Employee) => {
    try {
      const response = await fetch('/api/oncall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: employee.user_id }),
      })

      if (!response.ok) throw new Error('Failed to update oncall status')

      setSelectedEmployee(employee)
      setOpen(false)
      toast({
        title: "Success",
        description: `${employee.display_name} is now on call`,
      })
    } catch (error) {
      console.error('Error updating oncall status:', error)
      toast({
        title: "Error",
        description: "Failed to update oncall status",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium">On-Call Employee</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[300px] justify-between"
          >
            {selectedEmployee?.display_name ?? "Select employee..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search employees..." />
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => (
                <CommandItem
                  key={employee.user_id}
                  value={employee.display_name}
                  onSelect={() => handleSelect(employee)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedEmployee?.user_id === employee.user_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {employee.display_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 