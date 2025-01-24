"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Template } from "@/app/types/template"
import { useUser } from "@/app/hooks/useUser"
import { useTemplates } from "@/app/hooks/useTemplates"
import { TemplateCard } from "@/app/components/TemplateCard"
import { CreateTemplateModal } from "@/app/components/modals/CreateTemplateModal"
import { EditTemplateModal } from "@/app/components/modals/EditTemplateModal"
import { TemplateFormValues } from "@/app/lib/validations/template"

export default function TemplatesPage() {
  const { user } = useUser()
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  if (!user) return null

  const handleCreateTemplate = async (data: TemplateFormValues) => {
    await createTemplate(data)
  }

  const handleUpdateTemplate = async (id: string, data: TemplateFormValues) => {
    await updateTemplate(id, data)
  }

  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplate(id)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Response Templates</h1>
          <p className="text-muted-foreground">
            Create and manage templates for quick responses
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found</p>
          <Button
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4"
          >
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={(template) => setEditingTemplate(template)}
              onDelete={(template) => handleDeleteTemplate(template.id)}
            />
          ))}
        </div>
      )}

      <CreateTemplateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTemplate}
      />

      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          open={true}
          onClose={() => setEditingTemplate(null)}
          onUpdate={handleUpdateTemplate}
          onDelete={handleDeleteTemplate}
        />
      )}
    </div>
  )
} 