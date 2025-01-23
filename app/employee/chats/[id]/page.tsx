"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ChatMessages } from "@/app/components/ChatMessages"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface Profile {
  user_id: string
  display_name: string
  role: string
}

export default function ChatPage() {
  const params = useParams()
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchOtherUser = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, role')
        .eq('user_id', params.id)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        return
      }

      setOtherUser(data)
    }

    fetchOtherUser()
  }, [params.id, supabase])

  const getUserDisplayName = (userId: string) => {
    if (userId === params.id) {
      return otherUser?.display_name || 'User'
    }
    return 'You'
  }

  return (
    <div className="container mx-auto h-[calc(100vh-65px)] flex flex-col">
      <div className="border-b">
        <div className="flex items-center gap-3 p-3">
          <Link href="/employee/chats">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold leading-none">
              {otherUser?.display_name || 'Loading...'}
            </h1>
            {otherUser?.role && (
              <p className="text-xs text-muted-foreground mt-0.5">{otherUser.role}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-4 pb-6">
        {otherUser && (
          <ChatMessages
            otherUserId={params.id as string}
            getUserDisplayName={getUserDisplayName}
            showCreateTicket={otherUser.role === 'customer'}
          />
        )}
      </div>
    </div>
  )
} 