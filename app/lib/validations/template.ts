import * as z from "zod"

export const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(2000, "Content must be less than 2000 characters"),
})

export type TemplateFormValues = z.infer<typeof templateFormSchema> 