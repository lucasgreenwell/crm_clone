"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { templateFormSchema, TemplateFormValues } from "@/app/lib/validations/template"
import { extractTemplateVariables } from "@/app/types/template"

interface CreateTemplateModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TemplateFormValues) => Promise<void>
}

export function CreateTemplateModal({
  open,
  onClose,
  onSubmit,
}: CreateTemplateModalProps) {
  const [variables, setVariables] = useState<string[]>([])
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      content: "",
    },
  })

  // Update variables when content changes
  useEffect(() => {
    const content = form.watch("content")
    if (content) {
      setVariables(extractTemplateVariables(content))
    } else {
      setVariables([])
    }
  }, [form.watch("content")])

  const handleSubmit = async (data: TemplateFormValues) => {
    try {
      await onSubmit(data)
      form.reset()
      onClose()
    } catch (error) {
      console.error("Failed to create template:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter template name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter template content. Use {variable} for dynamic content."
                      className="h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {variables.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Detected Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit">Create Template</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 