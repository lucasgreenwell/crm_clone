import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { templateFormSchema } from "@/app/lib/validations/template"
import { extractTemplateVariables } from "@/app/types/template"
import { ZodError } from "zod"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: templates, error } = await supabase
      .from("templates")
      .select(`
        *,
        creator:created_by (
          display_name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Add variables to each template
    const templatesWithVariables = templates.map((template) => ({
      ...template,
      variables: extractTemplateVariables(template.content),
    }))

    return NextResponse.json(templatesWithVariables)
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get the request body
    const json = await request.json()

    // Validate the request body
    const validatedData = templateFormSchema.parse(json)

    // Insert the template
    const { data: template, error } = await supabase
      .from("templates")
      .insert({
        name: validatedData.name,
        content: validatedData.content,
        created_by: user.id,
      })
      .select(`
        *,
        creator:created_by (
          display_name
        )
      `)
      .single()

    if (error) throw error

    // Add variables to the template
    const templateWithVariables = {
      ...template,
      variables: extractTemplateVariables(template.content),
    }

    return NextResponse.json(templateWithVariables)
  } catch (error) {
    console.error("Error creating template:", error)
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
} 