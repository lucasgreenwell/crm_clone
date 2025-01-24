import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog"
import { Ticket } from "@/app/types/ticket"
import { TicketMessages } from "@/app/components/TicketMessages"
import { StatusSelect } from "@/app/components/StatusSelect"
import { useUser } from "@/app/hooks/useUser"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ViewTicketModalProps {
  ticket: Ticket | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange?: (ticket: Ticket, newStatus: Ticket['status']) => void
  onTicketUpdated: (ticket: Ticket) => void
  getUserDisplayName: (userId: string) => string
}

export function ViewTicketModal({
  ticket,
  open,
  onOpenChange,
  onStatusChange,
  onTicketUpdated,
  getUserDisplayName,
}: ViewTicketModalProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [isEditing, setIsEditing] = useState<{
    subject?: boolean
    description?: boolean
  }>({})
  const [editValues, setEditValues] = useState<{
    subject?: string
    description?: string
    assigned_to?: string | null
  }>({})
  const [assignees, setAssignees] = useState<Array<{ id: string, display_name: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canEdit = ticket && (
    user?.role === 'admin' || 
    user?.role === 'agent' || 
    user?.id === ticket.created_by
  )

  const canEditAssignee = user?.role === 'admin' || user?.role === 'agent'

  const loadAssignees = async () => {
    if (!canEditAssignee) return

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

  // Load assignees on mount if user can edit assignee
  useEffect(() => {
    if (canEditAssignee && open) {
      loadAssignees()
    }
  }, [canEditAssignee, open])

  const startEditing = (field: keyof typeof isEditing) => {
    if (!canEdit) return

    setIsEditing(prev => ({ ...prev, [field]: true }))
    setEditValues(prev => ({
      ...prev,
      [field]: ticket?.[field]
    }))
  }

  const handleSave = async (field: string) => {
    if (!ticket || !canEdit) return

    setIsSubmitting(true)

    try {
      const updatedTicket = {
        ...ticket,
        [field]: editValues[field as keyof typeof editValues]
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
      setIsEditing(prev => ({ ...prev, [field]: false }))
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({ ...prev, [field]: false }))
    setEditValues(prev => ({ ...prev, [field]: undefined }))
  }

  if (!ticket) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="space-y-4">
            {/* Subject */}
            {isEditing.subject ? (
              <div className="space-y-2">
                <Input
                  value={editValues.subject}
                  onChange={(e) => setEditValues(prev => ({ ...prev, subject: e.target.value }))}
                  className="text-xl font-semibold"
                  autoFocus
                  data-testid="edit-subject-input"
                />
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleSave('subject')}
                    disabled={isSubmitting}
                    data-testid="save-subject-button"
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleCancel('subject')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="group relative cursor-pointer"
                onClick={() => canEdit && startEditing('subject')}
                data-testid="edit-subject"
              >
                <h2 className="text-xl font-semibold pr-8">{ticket.subject}</h2>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="text-sm text-muted-foreground space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Created by: {getUserDisplayName(ticket.created_by)}</span>
                  <span>•</span>
                  <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {onStatusChange && user?.role !== 'customer' ? (
                  <div className="flex items-center gap-2">
                    <span>Status:</span>
                    <StatusSelect
                      value={ticket.status}
                      onValueChange={(value) => onStatusChange(ticket, value)}
                      triggerClassName="w-[120px] h-7"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Status:</span>
                    <span className="capitalize">{ticket.status}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span>Assigned to:</span>
                  {canEditAssignee ? (
                    <Select
                      value={ticket.assigned_to || 'unassigned'}
                      onValueChange={async (value) => {
                        const newAssignedTo = value === 'unassigned' ? null : value
                        const updatedTicket = {
                          ...ticket,
                          assigned_to: newAssignedTo
                        }
                        
                        setIsSubmitting(true)
                        try {
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
                        } finally {
                          setIsSubmitting(false)
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-[200px]">
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
                  ) : (
                    <span>{ticket.assigned_to ? getUserDisplayName(ticket.assigned_to) : 'Unassigned'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4">
              <h3 className="font-medium mb-2">Description</h3>
              {isEditing.description ? (
                <div className="space-y-2">
                  <Textarea
                    value={editValues.description}
                    onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleSave('description')}
                      disabled={isSubmitting}
                      data-testid="save-description-button"
                    >
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCancel('description')}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="group relative cursor-pointer"
                  onClick={() => canEdit && startEditing('description')}
                  data-testid="edit-description"
                >
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pr-8">
                    {ticket.description}
                  </p>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <h3 className="font-medium mb-4">Messages</h3>
          <TicketMessages
            ticketId={ticket.id}
            getUserDisplayName={getUserDisplayName}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
} 