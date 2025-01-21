import { useEffect, useState } from "react"
import { Ticket } from "@/app/types/ticket"
import { Button } from "@/components/ui/button"
import { Plus, MoreVertical, Pencil, Trash } from "lucide-react"
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
  const { toast } = useToast()
  const { user } = useUser()

  useEffect(() => {
    const loadTickets = async () => {
      const data = await fetchTickets()
      setTickets(data)
      setLoading(false)
    }

    loadTickets()
  }, [fetchTickets])

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

      {loading ? (
        <div>Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No tickets found</h3>
          <p className="text-muted-foreground mt-2">Create a new ticket to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
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
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize" 
                      style={{
                        backgroundColor: ticket.status === 'open' ? 'rgb(254 242 242)' : 
                          ticket.status === 'pending' ? 'rgb(254 249 195)' : 
                          ticket.status === 'resolved' ? 'rgb(220 252 231)' : 
                          'rgb(241 245 249)',
                        color: ticket.status === 'open' ? 'rgb(153 27 27)' : 
                          ticket.status === 'pending' ? 'rgb(161 98 7)' : 
                          ticket.status === 'resolved' ? 'rgb(22 101 52)' : 
                          'rgb(51 65 85)'
                      }}
                    >
                      {ticket.status.replace('_', ' ')}
                    </span>
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