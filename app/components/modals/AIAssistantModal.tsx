"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
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
  last_message_time: string
}

interface AIAssistantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: Conversation[]
  onConversationsChange: (conversations: Conversation[]) => void
}

interface EntityMention {
  type: EntityType
  entity: any
  display: string
}

export function AIAssistantModal({
  open,
  onOpenChange,
  conversations,
  onConversationsChange,
}: AIAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
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
      const conversationIdFromUrl = searchParams.get('conversation')
      if (conversationIdFromUrl) {
        loadConversation(conversationIdFromUrl)
      } else if (conversations.length > 0) {
        // Load the most recent conversation (first in the array since they're ordered by created_at desc)
        const mostRecentConversation = conversations[0]
        loadConversation(mostRecentConversation.id)
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      // Clear all mention-related state when modal closes
      setMentionPopupOpen(false)
      setSelectedEntityType(null)
      setSearchQuery("")
      setMentions([])
      setInput("")
    }
  }, [open])

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // First get all conversations
    const { data: conversationsData, error } = await supabase
      .from('ai_conversations')
      .select('id, created_at')
      .eq('user_id', user.id)

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
          message_count: messages.length,
          last_message_time: messages[0].created_at
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

    // Sort conversations by the time of the last message
    validConversations.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())

    onConversationsChange(validConversations)
    return validConversations.length > 0
  }

  const updateUrlWithConversation = (id: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('ai_chat', 'true')
    url.searchParams.set('conversation', id)
    router.replace(url.pathname + url.search)
  }

  const loadConversation = async (id: string) => {
    setConversationId(id)
    updateUrlWithConversation(id)

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

    updateUrlWithConversation(conversation.id)
    setConversationId(conversation.id)
    setMessages([])
    
    // Refresh conversations list
    const { data: messages } = await supabase
      .from('ai_messages')
      .select('content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })

    onConversationsChange([
      {
        ...conversation,
        preview: messages?.[0]?.content || 'New Conversation',
        message_count: messages?.length || 0
      },
      ...conversations
    ])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)

    // Handle @ symbol and filtering
    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1)
      
      // Check if we're in the middle of an existing mention
      const isExistingMention = mentions.some(mention => {
        const displayText = '@' + getEntityDisplayText(mention.type, mention.entity)
        const mentionStart = value.lastIndexOf(displayText)
        return mentionStart !== -1 && mentionStart <= lastAtIndex && 
               mentionStart + displayText.length > lastAtIndex
      })

      if (!isExistingMention) {
        if (lastAtIndex === value.length - 1) {
          // Just typed @
          const rect = e.target.getBoundingClientRect()
          const position = {
            top: rect.top - 320,
            left: rect.left + window.scrollX
          }
          setMentionPosition(position)
          setMentionPopupOpen(true)
          setSearchQuery("")
        } else if (!selectedEntityType) {
          // Filtering entity types
          setSearchQuery(textAfterAt)
          setMentionPopupOpen(true)
        }
      }
    } else {
      // No @ symbol, close the popup
      setMentionPopupOpen(false)
    }

    // Update search query if we're in entity selection mode
    if (selectedEntityType) {
      const lastMention = value.split('@').pop() || ''
      setSearchQuery(lastMention)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Prevent sending message if either popup is open
      if (mentionPopupOpen || selectedEntityType) {
        e.preventDefault()
        return
      }
      if (!isLoading) {
        e.preventDefault()
        handleSendMessage()
      }
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

    // Clear all mention-related states
    setSelectedEntityType(null)
    setMentionPopupOpen(false)
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
      case 'team':
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
      const spanAttributes = mention.type === 'ticket' 
        ? `class="entity-${mention.type}" id="${mention.entity.id}" href="/employee/tickets?ticket=${mention.entity.id}"`
        : `class="entity-${mention.type}" id="${mention.entity.id}"`
      
      messageWithSpans = messageWithSpans.replace(
        displayText,
        `<span ${spanAttributes}>${displayText}</span>`
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
      team_ids: mentions
        .filter(m => m.type === 'team')
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
      
      // Update conversations list with new preview
      const updatedConversations = conversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, preview: aiMessage.content, message_count: conv.message_count + 2 }
          : conv
      )
      onConversationsChange(updatedConversations)

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

  const handleSpanClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'SPAN' && target.classList.contains('entity-ticket')) {
      const href = target.getAttribute('href')
      if (href) {
        e.preventDefault()
        // Remove AI chat params before navigating
        const url = new URL(window.location.href)
        url.searchParams.delete('ai_chat')
        url.searchParams.delete('conversation')
        router.replace(url.pathname + url.search)
        // Close modal and navigate
        onOpenChange(false)
        router.push(href)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogTitle className="sr-only">CursorRM</DialogTitle>
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
                      onClick={handleSpanClick}
                      dangerouslySetInnerHTML={{ __html: message.content }}
                      className="[&_.entity-ticket]:bg-blue-100 [&_.entity-ticket]:text-blue-900 [&_.entity-ticket]:px-1 [&_.entity-ticket]:rounded [&_.entity-ticket]:cursor-pointer hover:[&_.entity-ticket]:underline
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
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... Use @ to mention entities"
                  disabled={isLoading}
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
                searchQuery={searchQuery}
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
                onBack={() => {
                  setSelectedEntityType(null)
                  setMentionPopupOpen(true)
                  setSearchQuery("")
                }}
                position={{ top: 0, left: 0 }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 
