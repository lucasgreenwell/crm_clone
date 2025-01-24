import { useEffect, useState } from "react"
import { Ticket } from "@/app/types/ticket"
import { Button } from "@/components/ui/button"
import { Plus, Search, X } from "lucide-react"
import { CreateTicketModal } from "@/app/components/modals/CreateTicketModal"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { TicketCard } from "@/app/components/TicketCard"

interface TicketsListProps {
  fetchTickets: () => Promise<Ticket[]>
  title: string
  defaultAssignee?: string
  showBulkActions?: boolean
  showSearch?: boolean
  showCreateTicket?: boolean
  subscriptionFilter?: {
    column: string
    value: string
  }
}

export function TicketsList({ 
  fetchTickets, 
  title, 
  defaultAssignee, 
  showBulkActions = true,
  showSearch = true,
  showCreateTicket = true,
  subscriptionFilter
}: TicketsListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<Ticket['status']>('open')
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false)
  const { toast } = useToast()
  const { user } = useUser()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadUsers = async () => {
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

    // Set up real-time subscription
    let query = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          ...(subscriptionFilter && {
            filter: `${subscriptionFilter.column}=eq.${subscriptionFilter.value}`
          })
        },
        async (payload) => {
          
          if (payload.eventType === 'INSERT') {
            const newTicket = payload.new as Ticket
            setTickets(prev => [newTicket, ...prev])
          } else if (payload.eventType === 'DELETE') {
            const deletedTicket = payload.old as Ticket
            setTickets(prev => prev.filter(t => t.id !== deletedTicket.id))
          } else if (payload.eventType === 'UPDATE') {
            const updatedTicket = payload.new as Ticket
            setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.channel('tickets-changes').unsubscribe()
    }
  }, [fetchTickets, subscriptionFilter])

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

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    )
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

  const handleBulkDelete = async () => {
    try {
      const response = await fetch("/api/tickets/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketIds: Array.from(selectedTickets),
          action: 'delete'
        }),
      })

      if (!response.ok) throw new Error("Failed to delete tickets")

      setTickets((prev) => prev.filter((t) => !selectedTickets.has(t.id)))
      setSelectedTickets(new Set())
      setShowBulkDeleteDialog(false)
      toast({
        title: "Success",
        description: "Tickets deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tickets",
        variant: "destructive",
      })
    }
  }

  const handleBulkStatusUpdate = async () => {
    try {
      const response = await fetch("/api/tickets/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketIds: Array.from(selectedTickets),
          action: 'update',
          status: bulkStatus
        }),
      })

      if (!response.ok) throw new Error("Failed to update tickets")

      const updatedTickets = await response.json()
      setTickets((prev) =>
        prev.map((t) => {
          const updated = updatedTickets.find((u: Ticket) => u.id === t.id)
          return updated || t
        })
      )
      setSelectedTickets(new Set())
      setShowBulkStatusDialog(false)
      toast({
        title: "Success",
        description: "Tickets updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tickets",
        variant: "destructive",
      })
    }
  }

  const toggleTicketSelection = (ticketId: string) => {
    const newSelected = new Set(selectedTickets)
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId)
    } else {
      newSelected.add(ticketId)
    }
    setSelectedTickets(newSelected)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {title && showCreateTicket && (
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
      )}

      {selectedTickets.size > 0 && showBulkActions ? (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedTickets.size} ticket{selectedTickets.size === 1 ? '' : 's'} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTickets(new Set())}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkStatusDialog(true)}
            >
              Update Status
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      ) : (
        showSearch && (
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
        )
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-8" data-testid="empty-state">
          <p className="text-muted-foreground">
            {Object.keys(filters).length > 0
              ? "Try adjusting your filters"
              : "Create a new ticket to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              canModifyTicket={canModifyTicket(ticket)}
              showCheckbox={showBulkActions && user?.role !== 'customer'}
              isSelected={selectedTickets.has(ticket.id)}
              onSelect={toggleTicketSelection}
              onStatusChange={user?.role !== 'customer' ? handleUpdateTicketStatus : undefined}
              onTicketUpdated={handleTicketUpdated}
              onDelete={canModifyTicket(ticket) ? () => {
                setTicketToDelete(ticket)
                setShowDeleteDialog(true)
              } : undefined}
              getUserDisplayName={getUserDisplayName}
            />
          ))}
        </div>
      )}

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

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tickets</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTickets.size} ticket{selectedTickets.size === 1 ? '' : 's'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>
              Update the status of {selectedTickets.size} ticket{selectedTickets.size === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <StatusSelect
              value={bulkStatus}
              onValueChange={setBulkStatus}
              triggerClassName="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkStatusDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusUpdate}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 