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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/employee/chats">
          <Button variant="ghost" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Chats
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">
          Chat with {otherUser?.display_name || 'Loading...'}
        </h1>
        {otherUser?.role && (
          <p className="text-muted-foreground">{otherUser.role}</p>
        )}
      </div>
      {otherUser && (
        <ChatMessages
          otherUserId={params.id as string}
          getUserDisplayName={getUserDisplayName}
        />
      )}
    </div>
  )
} 