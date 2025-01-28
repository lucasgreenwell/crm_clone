"use client"

import Link from "next/link"
import { useUser } from "@/app/hooks/useUser"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, Sparkles } from "lucide-react"
import { ChatNotifications } from "@/app/components/ChatNotifications"
import { useState, useEffect } from "react"
import { AIAssistantModal } from "@/app/components/modals/AIAssistantModal"
import { useSearchParams, useRouter } from "next/navigation"

export function Header() {
  const { user, signOut } = useUser()
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Check for AI chat params when component mounts or URL changes
    const isAiChat = searchParams.get('ai_chat') === 'true'
    if (isAiChat && user?.role === 'admin') {
      setAiModalOpen(true)
    }
  }, [searchParams, user?.role])

  const handleAiModalOpenChange = (open: boolean) => {
    setAiModalOpen(open)
    if (!open) {
      // Remove AI chat params from URL when modal closes
      const url = new URL(window.location.href)
      url.searchParams.delete('ai_chat')
      url.searchParams.delete('conversation')
      router.replace(url.pathname + url.search)
    }
  }

  const renderNavigation = () => {
    if (!user) return null

    if (user.role === 'customer') {
      return (
        <nav className="hidden md:block ml-10">
          <ul className="flex space-x-4">
            <li>
              <Link href="/customer/tickets" className="text-sm font-medium text-muted-foreground hover:text-primary">
                My Tickets
              </Link>
            </li>
            <li>
              <Link href="/customer/chats" className="text-sm font-medium text-muted-foreground hover:text-primary">
                Support Chats
              </Link>
            </li>
          </ul>
        </nav>
      )
    }

    return (
      <nav className="hidden md:block ml-10">
        <ul className="flex space-x-4">
          <li>
            <Link href="/employee/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/employee/tickets" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Tickets
            </Link>
          </li>
          <li>
            <Link href="/employee/chats" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Chats
            </Link>
          </li>
          <li>
            <Link href="/employee/customers" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Customers
            </Link>
          </li>
          <li>
            <Link href="/employee/templates" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Templates
            </Link>
          </li>
          {user.role === 'admin' && (
            <li>
              <Link href="/admin/management" className="text-sm font-medium text-muted-foreground hover:text-primary">
                Employees
              </Link>
            </li>
          )}
        </ul>
      </nav>
    )
  }

  return (
    <>
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0">
                <h1 className="text-2xl font-bold">Happy Users</h1>
              </Link>
              {renderNavigation()}
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                {user.role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAiModalOpen(true)}
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Sparkles className="h-5 w-5" />
                  </Button>
                )}
                <ChatNotifications />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user?.display_name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.display_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <div className="flex md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      {user?.role === 'admin' && (
        <AIAssistantModal
          open={aiModalOpen}
          onOpenChange={handleAiModalOpenChange}
        />
      )}
    </>
  )
}

