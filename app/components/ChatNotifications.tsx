import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUser } from "@/app/hooks/useUser"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function ChatNotifications() {
  const [unseenCount, setUnseenCount] = useState(0)
  const { user } = useUser()
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    const fetchUnseenCount = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('recipient_id', user.id)
        .eq('seen', false)

      if (error) {
        console.error('Error fetching unseen messages:', error)
        return
      }

      setUnseenCount(data.length)
    }

    fetchUnseenCount()

    // Subscribe to new messages and message updates
    const channel = supabase
      .channel('unseen-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchUnseenCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const navigateToChats = () => {
    const basePath = user?.role === 'customer' ? '/customer' : '/employee'
    router.push(`${basePath}/chats`)
  }

  if (unseenCount === 0) {
    return (
      <Button variant="ghost" size="icon" onClick={navigateToChats}>
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" onClick={navigateToChats} className="relative">
      <Bell className="h-5 w-5" />
      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
        {unseenCount > 99 ? '99+' : unseenCount}
      </span>
    </Button>
  )
} 