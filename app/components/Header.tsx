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
import { Bell, Menu } from "lucide-react"

export function Header() {
  const { user, signOut } = useUser()

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
          </ul>
        </nav>
      )
    }

    return (
      <nav className="hidden md:block ml-10">
        <ul className="flex space-x-4">
          <li>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/tickets" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Tickets
            </Link>
          </li>
          <li>
            <Link href="/customers" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Customers
            </Link>
          </li>
          <li>
            <Link href="/reports" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Reports
            </Link>
          </li>
        </ul>
      </nav>
    )
  }

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold">CRM Tool</h1>
            </Link>
            {renderNavigation()}
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2">
              <Bell className="h-5 w-5" />
            </Button>
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
          <div className="flex md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

