"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "./hooks/useUser"

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"]

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, fetchUser } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!loading) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname)
      
      if (!user && !isPublicPath) {
        router.push("/login")
      } else if (user && isPublicPath && pathname !== "/auth/callback") {
        router.push("/dashboard")
      }
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return children
} 