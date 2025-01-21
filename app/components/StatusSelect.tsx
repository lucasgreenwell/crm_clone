import { Ticket } from "@/app/types/ticket"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StatusSelectProps {
  value: Ticket['status']
  onValueChange: (value: Ticket['status']) => void
  triggerClassName?: string
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

export function StatusSelect({ value, onValueChange, triggerClassName }: StatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onValueChange(value as Ticket['status'])}
    >
      <SelectTrigger 
        className={triggerClassName || "border-0 p-0 h-auto hover:bg-transparent focus:ring-0 focus:ring-offset-0"}
        style={getStatusStyles(value)}
      >
        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize">
          {value}
        </span>
      </SelectTrigger>
      <SelectContent className="p-0 min-w-0">
        <SelectItem value="open" className="py-1 px-0 m-0 data-[highlighted]:bg-transparent focus:bg-transparent data-[state=checked]:opacity-100 opacity-40 [&>span:first-child]:hidden">
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize w-full" style={getStatusStyles('open')}>
            Open
          </span>
        </SelectItem>
        <SelectItem value="pending" className="py-1 px-0 m-0 data-[highlighted]:bg-transparent focus:bg-transparent data-[state=checked]:opacity-100 opacity-40 [&>span:first-child]:hidden">
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize w-full" style={getStatusStyles('pending')}>
            Pending
          </span>
        </SelectItem>
        <SelectItem value="resolved" className="py-1 px-0 m-0 data-[highlighted]:bg-transparent focus:bg-transparent data-[state=checked]:opacity-100 opacity-40 [&>span:first-child]:hidden">
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize w-full" style={getStatusStyles('resolved')}>
            Resolved
          </span>
        </SelectItem>
        <SelectItem value="closed" className="py-1 px-0 m-0 data-[highlighted]:bg-transparent focus:bg-transparent data-[state=checked]:opacity-100 opacity-40 [&>span:first-child]:hidden">
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize w-full" style={getStatusStyles('closed')}>
            Closed
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
} 