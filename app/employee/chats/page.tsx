"use client"

import { ChatList } from "@/app/components/ChatList"
import { NewChatButton } from "@/app/components/NewChatButton"

export default function ChatsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Chats</h1>
        <NewChatButton />
      </div>
      <ChatList />
    </div>
  )
} 