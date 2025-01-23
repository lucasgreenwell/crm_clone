"use client"

import { ChatList } from "@/app/components/ChatList"

export default function CustomerChatsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Support Chats</h1>
      </div>
      <ChatList />
    </div>
  )
} 