import { useEffect, useState } from "react"
import { Ticket } from "@/app/types/ticket"
import { Button } from "@/components/ui/button"
import { Plus, MoreVertical, Pencil, Trash, Search, X } from "lucide-react"
import { CreateTicketModal } from "@/app/components/modals/CreateTicketModal"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/app/hooks/useUser"
import { TicketFilters, UserOption } from "@/app/types/filters"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { StatusSelect } from "@/app/components/StatusSelect"

interface TicketsListProps {
  fetchTickets: () => Promise<Ticket[]>
  title: string
  defaultAssignee?: string
}

export function TicketsList({ fetchTickets, title, defaultAssignee }: TicketsListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [users, setUsers] = useState<UserOption[]>([])
  const { toast } = useToast()
  const { user } = useUser()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadUsers = async () => {
      // Get unique user IDs from tickets
      const uniqueUserIds = new Set<string>()
      tickets.forEach(ticket => {
        if (ticket.created_by) uniqueUserIds.add(ticket.created_by)
        if (ticket.assigned_to) uniqueUserIds.add(ticket.assigned_to)
      })

      if (uniqueUserIds.size === 0) return

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', Array.from(uniqueUserIds))
        .order('display_name')

      if (error) {
        console.error('Error loading users:', error)
        return
      }

      setUsers(data.map(u => ({ id: u.user_id, display_name: u.display_name })))
    }

    if (tickets.length > 0) {
      loadUsers()
    }
  }, [tickets])

  useEffect(() => {
    const loadTickets = async () => {
      const data = await fetchTickets()
      setTickets(data)
      setLoading(false)
    }

    loadTickets()
  }, [fetchTickets])

  // Get unique lists of users for each dropdown
  const creatorUsers = users.filter(u => 
    tickets.some(t => t.created_by === u.id)
  )

  const assigneeUsers = users.filter(u => 
    tickets.some(t => t.assigned_to === u.id)
  )

  const filteredTickets = tickets.filter(ticket => {
    if (filters.search && !ticket.subject.toLowerCase().includes(filters.search.toLowerCase()) &&
        !ticket.description?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.status && ticket.status !== filters.status) {
      return false
    }
    if (filters.created_by && ticket.created_by !== filters.created_by) {
      return false
    }
    if (filters.assigned_to === 'unassigned') {
      if (ticket.assigned_to !== null) return false
    } else if (filters.assigned_to && ticket.assigned_to !== filters.assigned_to) {
      return false
    }
    return true
  })

  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev])
  }

  const handleUpdateTicket = async (ticket: Ticket) => {
    try {
      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticket),
      })

      if (!response.ok) throw new Error("Failed to update ticket")

      const updatedTicket = await response.json()
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      )
      setEditingTicket(null)
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

  const handleDeleteTicket = async (ticket: Ticket) => {
    try {
      const response = await fetch(`/api/tickets?id=${ticket.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete ticket")

      setTickets((prev) => prev.filter((t) => t.id !== ticket.id))
      setShowDeleteDialog(false)
      setTicketToDelete(null)
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      })
    }
  }

  const canModifyTicket = (ticket: Ticket) => {
    return user?.id === ticket.created_by
  }

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.display_name || 'Unknown User'
  }

  const handleUpdateTicketStatus = async (ticket: Ticket, newStatus: Ticket['status']) => {
    try {
      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...ticket, status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update ticket status")

      const updatedTicket = await response.json()
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      )
      toast({
        title: "Success",
        description: "Ticket status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      })
    }
  }

  const getStatusStyles = (status: Ticket['status']) => ({
    backgroundColor: status === 'open' ? 'rgb(254 242 242)' : 
      status === 'pending' ? 'rgb(254 249 195)' : 
      status === 'resolved' ? 'rgb(220 252 231)' : 
      'rgb(241 245 249)',
    color: status === 'open' ? 'rgb(153 27 27)' : 
      status === 'pending' ? 'rgb(161 98 7)' : 
      status === 'resolved' ? 'rgb(22 101 52)' : 
      'rgb(51 65 85)'
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        <CreateTicketModal
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Ticket
            </Button>
          }
          onTicketCreated={handleTicketCreated}
          defaultAssignee={defaultAssignee}
        />
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-8"
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-4 w-4 p-0"
                  onClick={() => setFilters(prev => ({ ...prev, search: undefined }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any || undefined }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.created_by}
            onValueChange={(value) => setFilters(prev => ({ ...prev, created_by: value === 'all' ? undefined : value }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by creator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All creators</SelectItem>
              {creatorUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name || 'Unknown User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.assigned_to}
            onValueChange={(value) => setFilters(prev => ({ ...prev, assigned_to: value === 'all' ? undefined : value }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assigneeUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name || 'Unknown User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {Object.keys(filters).length > 0 && (
            <Button
              variant="outline"
              onClick={() => setFilters({})}
              size="sm"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div>Loading tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No tickets found</h3>
          <p className="text-muted-foreground mt-2">
            {Object.keys(filters).length > 0 
              ? "Try adjusting your filters"
              : "Create a new ticket to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 border rounded-lg hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticket.description}
                  </p>
                  <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                    <span>Created by: {getUserDisplayName(ticket.created_by)}</span>
                    {ticket.assigned_to && (
                      <>
                        <span>•</span>
                        <span>Assigned to: {getUserDisplayName(ticket.assigned_to)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    {user?.role !== 'customer' ? (
                      <StatusSelect
                        value={ticket.status}
                        onValueChange={(value) => handleUpdateTicketStatus(ticket, value)}
                      />
                    ) : (
                      <span 
                        className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize" 
                        style={getStatusStyles(ticket.status)}
                      >
                        {ticket.status}
                      </span>
                    )}
                    {canModifyTicket(ticket) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Ticket actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTicket(ticket)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setTicketToDelete(ticket)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Ticket Dialog */}
      <Dialog open={!!editingTicket} onOpenChange={() => setEditingTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Make changes to your ticket here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {editingTicket && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleUpdateTicket({
                  ...editingTicket,
                  subject: formData.get("subject") as string,
                  description: formData.get("description") as string,
                  status: formData.get("status") as Ticket['status'] || editingTicket.status,
                })
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={editingTicket.subject}
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
                  defaultValue={editingTicket.description}
                  required
                />
              </div>
              {user?.role !== 'customer' && (
                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium">
                    Status
                  </label>
                  <input type="hidden" name="status" value={editingTicket.status} />
                  <StatusSelect
                    value={editingTicket.status}
                    onValueChange={(value) => {
                      setEditingTicket({ ...editingTicket, status: value })
                    }}
                    triggerClassName="w-full"
                  />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTicket(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => ticketToDelete && handleDeleteTicket(ticketToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 