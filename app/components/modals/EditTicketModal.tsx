import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { StatusSelect } from "@/app/components/StatusSelect"
import { Ticket } from "@/app/types/ticket"
import { useUser } from "@/app/hooks/useUser"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserOption } from "@/app/types/filters"

interface EditTicketModalProps {
  ticket: Ticket | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTicketUpdated: (ticket: Ticket) => void
}

export function EditTicketModal({
  ticket,
  open,
  onOpenChange,
  onTicketUpdated,
}: EditTicketModalProps) {
  const { toast } = useToast()
  const { user } = useUser()
  const [assignees, setAssignees] = useState<UserOption[]>([])
  const supabase = createClientComponentClient()
  const [currentStatus, setCurrentStatus] = useState<Ticket['status']>('open')

  useEffect(() => {
    const loadAssignees = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, role')
        .in('role', ['admin', 'agent'])
        .order('display_name')

      if (error) {
        console.error('Error loading assignees:', error)
        return
      }

      setAssignees(data.map(u => ({ 
        id: u.user_id, 
        display_name: u.display_name || 'Unknown User'
      })))
    }

    if (open && (user?.role === 'admin' || user?.role === 'agent')) {
      loadAssignees()
    }
  }, [open, user?.role])

  useEffect(() => {
    if (ticket) {
      setCurrentStatus(ticket.status)
    }
  }, [ticket])

  const handleUpdateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!ticket) return

    try {
      const formData = new FormData(e.currentTarget)
      const assignedTo = formData.get("assigned_to") as string
      const updatedTicket = {
        ...ticket,
        subject: formData.get("subject") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as Ticket['status'] || ticket.status,
        ...(assignedTo !== 'unassigned' && { assigned_to: assignedTo }),
      }

      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTicket),
      })

      if (!response.ok) throw new Error("Failed to update ticket")

      const result = await response.json()
      onTicketUpdated(result)
      onOpenChange(false)
      toast({
        title: "Success",
        description: "Ticket updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Ticket</DialogTitle>
          <DialogDescription>
            Make changes to your ticket here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        {ticket && (
          <form
            onSubmit={handleUpdateTicket}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject
              </label>
              <Input
                id="subject"
                name="subject"
                defaultValue={ticket.subject}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                defaultValue={ticket.description}
                required
              />
            </div>
            {user?.role !== 'customer' && (
              <>
                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium">
                    Status
                  </label>
                  <input type="hidden" name="status" value={currentStatus} />
                  <StatusSelect
                    value={currentStatus}
                    onValueChange={(value) => {
                      setCurrentStatus(value)
                    }}
                    triggerClassName="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="assigned_to" className="text-sm font-medium">
                    Assigned To
                  </label>
                  <input 
                    type="hidden" 
                    name="assigned_to" 
                    value={ticket.assigned_to || 'unassigned'} 
                  />
                  <Select
                    defaultValue={ticket.assigned_to || 'unassigned'}
                    onValueChange={(value) => {
                      const input = document.querySelector('input[name="assigned_to"]') as HTMLInputElement
                      if (input) input.value = value === 'unassigned' ? '' : value
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {assignees.map(assignee => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
} 