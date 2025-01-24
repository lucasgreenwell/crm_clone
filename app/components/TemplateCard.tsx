"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Template } from "@/app/types/template"
import { formatDistanceToNow } from "date-fns"

interface TemplateCardProps {
  template: Template
  onEdit: (template: Template) => void
  onDelete: (template: Template) => void
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-transform transform hover:scale-105 shadow-lg rounded-lg bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{template.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Created by {template.creator?.display_name}
            </p>
            <p className="text-sm text-muted-foreground">
              Updated {formatDistanceToNow(new Date(template.updated_at))} ago
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(template)}
              className="text-primary hover:text-primary"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(template)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Template Variables</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {template.variables.map((variable: string) => (
                <Badge key={variable} variant="secondary">
                  {variable}
                </Badge>
              ))}
              {template.variables.length === 0 && (
                <p className="text-sm text-muted-foreground">No variables</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Preview</p>
            <p className="text-sm mt-1 line-clamp-3">{template.content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 