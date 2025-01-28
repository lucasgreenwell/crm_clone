"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, ChevronRight, ChevronLeft } from "lucide-react"
import { Message } from "@/app/types/message"
import { MessageItem } from "@/app/components/MessageItem"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  created_at: string
  preview: string
  message_count: number
}

interface AIAssistantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIAssistantModal({
  open,
  onOpenChange,
}: AIAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (open) {
      loadConversations()
    }
  }, [open])

  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversation')
    const isAiChat = searchParams.get('ai_chat') === 'true'
    
    if (conversationIdFromUrl && isAiChat) {
      loadConversation(conversationIdFromUrl)
    } else if (open && conversations.length > 0) {
      // Update URL with ai_chat=true and the first conversation
      router.push(`?ai_chat=true&conversation=${conversations[0].id}`)
      loadConversation(conversations[0].id)
    }
  }, [searchParams, conversations, open])

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // First get all conversations
    const { data: conversationsData, error } = await supabase
      .from('ai_conversations')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading conversations:', error)
      return
    }

    // Get message counts and latest messages for each conversation
    const conversationsWithDetails = await Promise.all(
      conversationsData.map(async (conv) => {
        const { data: messages, error: messagesError } = await supabase
          .from('ai_messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })

        if (messagesError) {
          console.error('Error fetching messages:', messagesError)
          return null
        }

        // Only include conversations with messages
        if (!messages || messages.length === 0) {
          return null
        }

        return {
          ...conv,
          preview: messages[0].content,
          message_count: messages.length
        }
      })
    )

    // Filter out null values and conversations with no messages
    const validConversations = conversationsWithDetails
      .filter((conv): conv is NonNullable<typeof conv> => 
        conv !== null && conv.message_count > 0
      )
      .map(conv => ({
        ...conv,
        preview: conv.preview || 'New Conversation'
      }))

    setConversations(validConversations)
  }

  const loadConversation = async (id: string) => {
    setConversationId(id)
    router.push(`?ai_chat=true&conversation=${id}`)

    const { data: messagesData, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      return
    }

    setMessages(messagesData)
  }

  const createNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      })
      return
    }

    router.push(`?ai_chat=true&conversation=${conversation.id}`)
    setConversationId(conversation.id)
    setMessages([])
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId || isLoading) return

    setIsLoading(true)
    const content = input.trim()
    setInput("")

    // Create a temporary message to show immediately
    const tempMessage: Message = {
      id: Date.now().toString(),
      content: content,
      is_ai: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: null,
      message: content,
      recipient_id: 'ai-assistant',
      seen: true,
      conversation_id: conversationId
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          conversationId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const aiMessage = await response.json()
      setMessages(prev => [...prev, aiMessage])
      
      // Refresh conversations list to update previews
      loadConversations()
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <div className="flex h-[70vh]">
          <div className={cn(
            "border-r transition-all",
            isSidebarOpen ? "w-64" : "w-0"
          )}>
            {isSidebarOpen && (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <Button 
                    onClick={createNewConversation}
                    className="w-full"
                  >
                    New Chat
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-accent truncate",
                        conversationId === conv.id && "bg-accent"
                      )}
                    >
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {conv.preview}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="p-2 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.is_ai ? "justify-start" : "justify-end"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-lg p-4",
                    message.is_ai ? "bg-accent" : "bg-primary text-primary-foreground"
                  )}>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">Thinking...</div>
                </div>
              )}
            </div>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage} 
                  size="icon"
                  disabled={isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
