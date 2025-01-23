"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { EmbedChatWidget } from "../../components/EmbedChatWidget"

export default function EmbedChatPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    
    checkAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <div className="w-full h-full">
      <EmbedChatWidget isAuthenticated={isAuthenticated} />
    </div>
  )
} 