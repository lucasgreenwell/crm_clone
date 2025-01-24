import { Database } from '@/types/database'

export type Template = Database['public']['Tables']['templates']['Row'] & {
  creator?: {
    display_name: string
  }
  variables: string[]
}

export type CreateTemplateInput = {
  name: string
  content: string
}

export type UpdateTemplateInput = {
  id: string
  name: string
  content: string
}

// Utility function to extract variables from template content
export function extractTemplateVariables(content: string): string[] {
  const variableRegex = /{([^}]+)}/g
  const matches = content.match(variableRegex)
  if (!matches) return []
  return matches.map(match => match.slice(1, -1)) // Remove the curly braces
} 