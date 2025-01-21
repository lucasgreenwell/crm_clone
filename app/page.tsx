"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/app/hooks/useUser"

export default function Home() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Redirect based on user role
    if (user.role === "customer") {
      router.push("/customer/tickets")
    } else {
      router.push("/employee/dashboard")
    }
  }, [user, router])

  return null
}

