"use client"

import { ChatList } from "@/app/components/ChatList"
import { GetHelpButton } from "@/app/components/GetHelpButton"

export default function CustomerChatsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Support Chats</h1>
        <GetHelpButton />
      </div>
      <ChatList />
    </div>
  )
} 