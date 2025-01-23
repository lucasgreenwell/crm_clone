"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUser } from "@/app/hooks/useUser"
import { Conversation } from "@/app/types/message"
import Link from "next/link"

export function ChatList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const { user } = useUser()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return

      // First, get all messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      // Then, get all unique user IDs from messages
      const uniqueUserIds = new Set<string>()
      messages?.forEach(message => {
        if (message.sender_id !== user.id) uniqueUserIds.add(message.sender_id)
        if (message.recipient_id !== user.id) uniqueUserIds.add(message.recipient_id)
      })

      // Fetch user profiles for all unique users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, role')
        .in('user_id', Array.from(uniqueUserIds))

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return
      }

      // Create a map of user profiles for easy lookup
      const profilesMap = new Map(
        profiles?.map(profile => [profile.user_id, profile])
      )

      // Transform messages into conversations
      const conversationsMap = new Map<string, Conversation>()

      messages?.forEach((message) => {
        const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id
        const otherUserProfile = profilesMap.get(otherUserId)

        if (!otherUserProfile) return

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            other_user: {
              id: otherUserProfile.user_id,
              display_name: otherUserProfile.display_name,
              role: otherUserProfile.role,
            },
            latest_message: message,
            unread_count: message.recipient_id === user.id && !message.seen ? 1 : 0,
          })
        } else if (!message.seen && message.recipient_id === user.id) {
          const conversation = conversationsMap.get(otherUserId)!
          conversation.unread_count++
        }
      })

      setConversations(Array.from(conversationsMap.values()))
    }

    fetchConversations()

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <Link
          key={conversation.other_user.id}
          href={`/employee/chats/${conversation.other_user.id}`}
          className="block"
        >
          <div className="p-4 rounded-lg border hover:border-primary transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{conversation.other_user.display_name}</h3>
                <p className="text-sm text-muted-foreground">{conversation.other_user.role}</p>
              </div>
              {conversation.unread_count > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  {conversation.unread_count}
                </span>
              )}
            </div>
            {conversation.latest_message && (
              <p className="mt-2 text-sm text-muted-foreground truncate">
                {conversation.latest_message.message}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
} 