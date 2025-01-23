"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserSearchModal } from "@/app/components/modals/UserSearchModal"
import { useRouter } from "next/navigation"

export function NewChatButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const handleUserSelect = (user: { user_id: string }) => {
    // Navigate to the chat with the selected user
    router.push(`/employee/chats/${user.user_id}`)
  }

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        Start New Chat
      </Button>
      <UserSearchModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUserSelect={handleUserSelect}
      />
    </>
  )
} 