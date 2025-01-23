"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash } from "lucide-react"

interface MessageItemProps {
  message: {
    id: string
    sender_id: string
    message: string
    internal_only?: boolean
    created_at: string
  }
  userId: string
  getUserDisplayName: (userId: string) => string
  onEdit: (id: string, newMessage: string) => void
  onDelete: (id: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export function MessageItem({ message, userId, getUserDisplayName, onEdit, onDelete, onKeyDown }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.message)

  const handleSaveEdit = () => {
    if (editValue.trim()) {
      onEdit(message.id, editValue.trim())
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditValue(message.message)
  }

  return (
    <div
      className={`p-4 rounded-lg ${
        message.internal_only
          ? "bg-yellow-50 border border-yellow-200"
          : userId === message.sender_id
          ? "bg-primary/10 border border-primary/20 ml-auto"
          : "bg-gray-50 border border-gray-200 mr-auto"
      } max-w-[70%]`}
      onKeyDown={onKeyDown}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-medium">
            {getUserDisplayName(message.sender_id)}
          </span>
          {message.internal_only && (
            <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
              Internal Only
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {new Date(message.created_at).toLocaleString()}
          </span>
          {userId === message.sender_id && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(message.id)}
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[100px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSaveEdit()
              } else if (e.key === 'Escape') {
                handleCancelEdit()
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleSaveEdit}
            >
              Save
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
      )}
    </div>
  )
} 