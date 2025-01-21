"use client"

import { useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut()
      router.push('/login')
    }
    logout()
  }, [router, supabase.auth])

  return null
} 