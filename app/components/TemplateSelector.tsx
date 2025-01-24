"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTemplates } from "@/app/hooks/useTemplates"

interface TemplateSelectorProps {
  onSelect: (content: string) => void
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const { templates, isLoading } = useTemplates()

  if (isLoading || templates.length === 0) return null

  return (
    <Select onValueChange={(templateId) => {
      const template = templates.find(t => t.id === templateId)
      if (template) {
        onSelect(template.content)
      }
    }}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select template" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Response Templates</SelectLabel>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
} 