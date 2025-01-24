import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { templateFormSchema } from "@/app/lib/validations/template"
import { extractTemplateVariables } from "@/app/types/template"
import { ZodError } from "zod"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if the template exists and if the user has permission to update it
    const { data: existingTemplate, error: templateError } = await supabase
      .from("templates")
      .select("created_by")
      .eq("id", params.id)
      .single()

    if (templateError) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Update the template
    const { data: template, error } = await supabase
      .from("templates")
      .update({
        name: validatedData.name,
        content: validatedData.content,
      })
      .eq("id", params.id)
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
    console.error("Error updating template:", error)
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if the template exists and if the user has permission to delete it
    const { data: existingTemplate, error: templateError } = await supabase
      .from("templates")
      .select("created_by")
      .eq("id", params.id)
      .single()

    if (templateError) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Delete the template
    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", params.id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
} 