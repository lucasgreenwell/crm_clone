"use client"

import { useState, useEffect, useRef } from "react"
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
import { MentionPopup, EntityType } from "@/app/components/MentionPopup"
import { EntitySearchResults } from "@/app/components/EntitySearchResults"

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

interface EntityMention {
  type: EntityType
  entity: any
  display: string
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
  const [mentionPopupOpen, setMentionPopupOpen] = useState(false)
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [mentions, setMentions] = useState<EntityMention[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      loadConversations().then((hasConversations) => {
        if (!hasConversations) {
          createNewConversation()
        }
      })
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
    // Note: if no conversations exist, the first useEffect will handle creating one
  }, [searchParams, conversations, open])

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // First get all conversations
    const { data: conversationsData, error } = await supabase
      .from('ai_conversations')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading conversations:', error)
      return false
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
    return validConversations.length > 0
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)

    // Check for @ symbol
    if (value.endsWith('@')) {
      const rect = e.target.getBoundingClientRect()
      const position = {
        top: rect.top - 320, // Position above input, with space for the popup
        left: rect.left + window.scrollX
      }
      setMentionPosition(position)
      setMentionPopupOpen(true)
    }

    // Update search query if we're in entity selection mode
    if (selectedEntityType) {
      const lastMention = value.split('@').pop() || ''
      setSearchQuery(lastMention)
    }
  }

  const handleEntityTypeSelect = (type: EntityType) => {
    setSelectedEntityType(type)
    setMentionPopupOpen(false)
    setSearchQuery("")
  }

  const handleEntitySelect = (entity: any) => {
    const displayText = getEntityDisplayText(selectedEntityType!, entity)
    const mention: EntityMention = {
      type: selectedEntityType!,
      entity,
      display: displayText
    }
    setMentions([...mentions, mention])

    // Replace the @mention text with the display text
    const parts = input.split('@')
    parts[parts.length - 1] = displayText + ' '
    setInput(parts.join('@'))
    setSelectedEntityType(null)
    setSearchQuery("")

    // Focus back on input
    inputRef.current?.focus()
  }

  const getEntityDisplayText = (type: EntityType, entity: any): string => {
    switch (type) {
      case 'ticket':
        return `ticket-${entity.id.slice(0, 8)}`
      case 'message':
        return `message-${entity.id.slice(0, 8)}`
      case 'customer':
        return entity.display_name
      case 'employee':
        return entity.display_name
      case 'template':
        return entity.name
      default:
        return 'unknown'
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId || isLoading) return

    setIsLoading(true)
    const content = input.trim()
    setInput("")

    // Format message content with entity spans
    let messageWithSpans = content
    for (const mention of mentions) {
      const displayText = '@' + getEntityDisplayText(mention.type, mention.entity)
      messageWithSpans = messageWithSpans.replace(
        displayText,
        `<span class="entity-${mention.type}" id="${mention.entity.id}">${displayText}</span>`
      )
    }

    // Collect entity IDs
    const entityIds = {
      ticket_ids: mentions
        .filter(m => m.type === 'ticket')
        .map(m => m.entity.id),
      message_ids: mentions
        .filter(m => m.type === 'message')
        .map(m => m.entity.id),
      profile_ids: mentions
        .filter(m => m.type === 'customer' || m.type === 'employee')
        .map(m => m.entity.id),
      template_ids: mentions
        .filter(m => m.type === 'template')
        .map(m => m.entity.id),
    }

    // Create a temporary message to show immediately
    const tempMessage: Message = {
      id: Date.now().toString(),
      content: messageWithSpans, // Show spans in UI for consistent display
      is_ai: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: null,
      message: content,
      recipient_id: 'ai-assistant',
      seen: true,
      conversation_id: conversationId,
      ...entityIds
    }
    setMessages(prev => [...prev, tempMessage])
    setMentions([])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageWithSpans,
          conversationId,
          ...entityIds
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
        <div className="flex h-[70vh] relative">
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
                    <div 
                      dangerouslySetInnerHTML={{ __html: message.content }}
                      className="[&_.entity-ticket]:bg-blue-100 [&_.entity-ticket]:text-blue-900 [&_.entity-ticket]:px-1 [&_.entity-ticket]:rounded
                                [&_.entity-message]:bg-green-100 [&_.entity-message]:text-green-900 [&_.entity-message]:px-1 [&_.entity-message]:rounded
                                [&_.entity-customer]:bg-purple-100 [&_.entity-customer]:text-purple-900 [&_.entity-customer]:px-1 [&_.entity-customer]:rounded
                                [&_.entity-employee]:bg-yellow-100 [&_.entity-employee]:text-yellow-900 [&_.entity-employee]:px-1 [&_.entity-employee]:rounded
                                [&_.entity-template]:bg-pink-100 [&_.entity-template]:text-pink-900 [&_.entity-template]:px-1 [&_.entity-template]:rounded"
                    />
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
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message... Use @ to mention entities"
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

          {mentionPopupOpen && (
            <div className="absolute bottom-[80px] left-[300px] z-50">
              <MentionPopup
                isOpen={mentionPopupOpen}
                onClose={() => setMentionPopupOpen(false)}
                onSelect={handleEntityTypeSelect}
                position={{ top: 0, left: 0 }}
              />
            </div>
          )}

          {selectedEntityType && (
            <div className="absolute bottom-[80px] left-[300px] z-50">
              <EntitySearchResults
                type={selectedEntityType}
                searchQuery={searchQuery}
                onSelect={handleEntitySelect}
                onClose={() => setSelectedEntityType(null)}
                position={{ top: 0, left: 0 }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 
