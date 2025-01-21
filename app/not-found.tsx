"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "./hooks/useUser"

export default function NotFound() {
  const router = useRouter()
  const { user, loading } = useUser()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
        return
      }

      switch (user.role) {
        case "customer":
          router.push("/customer/tickets")
          break
        case "admin":
        case "agent":
          router.push("/employee/dashboard")
          break
        default:
          router.push("/login")
      }
    }
  }, [user, loading, router])

  // Return null since we're redirecting anyway and don't want to flash any content
  return null
} 