"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      console.log(authUser)
      if (authUser) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).single()
        console.log(profile)

        setUser(profile ? { ...authUser, ...profile } : authUser)
      }
      setLoading(false)
    }

    fetchUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single()

        setUser(profile ? { ...session.user, ...profile } : session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const value = {
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

