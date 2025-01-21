"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "./hooks/useUser"

export default function Home() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, loading, router])

  return (
    <div className="flex justify-center items-center min-h-screen">
      <p>Loading...</p>
    </div>
  )
}

