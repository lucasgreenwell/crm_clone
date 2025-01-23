"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { ChatMessages } from "@/app/components/ChatMessages"

interface EmbedChatWidgetProps {
  isAuthenticated: boolean
}

export function EmbedChatWidget({ isAuthenticated }: EmbedChatWidgetProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowChat(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          role: "customer", // Always create as customer for embedded widget
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to sign up")
      }

      // After successful signup, sign in
      await handleSignIn(e, true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent, skipLoading = false) => {
    e.preventDefault()
    if (!skipLoading) setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      setShowChat(true)
      toast({
        title: "Success",
        description: "Signed in successfully",
        duration: 3000,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign in",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      if (!skipLoading) setLoading(false)
    }
  }

  if (!isAuthenticated || !showChat) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">
          {isSignUp ? "Create an Account" : "Sign In"}
        </h2>
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          {isSignUp && (
            <Input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={loading}
            />
          )}
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>
        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-500 hover:underline"
            disabled={loading}
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </div>
      </div>
    )
  }

  // Use the specified support agent ID
  const SUPPORT_AGENT_ID = "bce7542a-c8ad-42b2-8cd9-9251ca6dcc27"

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-primary text-primary-foreground">
        <h2 className="text-lg font-semibold">Chat Support</h2>
      </div>
      <div className="flex-1 overflow-hidden px-4 pb-4">
        <ChatMessages
          otherUserId={SUPPORT_AGENT_ID}
          getUserDisplayName={(id) => id === SUPPORT_AGENT_ID ? "Support Agent" : "You"}
        />
      </div>
    </div>
  )
} 