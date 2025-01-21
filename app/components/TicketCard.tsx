import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"
import { Ticket } from "@/app/types/ticket"
import { StatusSelect } from "@/app/components/StatusSelect"
import { Checkbox } from "@/components/ui/checkbox"
import { ViewTicketModal } from "@/app/components/modals/ViewTicketModal"
import { useState } from "react"

interface TicketCardProps {
  ticket: Ticket
  canModifyTicket: boolean
  showCheckbox?: boolean
  isSelected?: boolean
  onSelect?: (ticketId: string) => void
  onStatusChange?: (ticket: Ticket, newStatus: Ticket['status']) => void
  onTicketUpdated: (ticket: Ticket) => void
  onDelete?: (ticket: Ticket) => void
  getUserDisplayName: (userId: string) => string
}

export function TicketCard({
  ticket,
  canModifyTicket,
  showCheckbox = false,
  isSelected = false,
  onSelect,
  onStatusChange,
  onTicketUpdated,
  onDelete,
  getUserDisplayName,
}: TicketCardProps) {
  const [showViewModal, setShowViewModal] = useState(false)

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

  const handleClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking checkbox or delete button
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest('[data-testid="ticket-select-checkbox"]') ||
        e.target.closest('[data-testid="delete-button"]'))
    ) {
      return
    }
    setShowViewModal(true)
  }

  return (
    <>
      <div 
        className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex justify-between items-start gap-4">
          {showCheckbox && onSelect && (
            <div className="pt-1">
              <Checkbox
                data-testid="ticket-select-checkbox"
                checked={isSelected}
                onCheckedChange={() => onSelect(ticket.id)}
              />
            </div>
          )}
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
              {onStatusChange ? (
                <StatusSelect
                  value={ticket.status}
                  onValueChange={(value) => onStatusChange(ticket, value)}
                />
              ) : (
                <span 
                  className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize" 
                  style={getStatusStyles(ticket.status)}
                >
                  {ticket.status}
                </span>
              )}
              {canModifyTicket && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="delete-button"
                  onClick={() => onDelete(ticket)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-2">
              {new Date(ticket.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <ViewTicketModal
        ticket={ticket}
        open={showViewModal}
        onOpenChange={setShowViewModal}
        onStatusChange={onStatusChange}
        onTicketUpdated={onTicketUpdated}
        getUserDisplayName={getUserDisplayName}
      />
    </>
  )
} 