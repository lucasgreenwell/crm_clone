import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const data = await request.json()

    const { error } = await supabase.from("tickets").insert([
      {
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        channel: data.channel,
        status: data.status,
        created_by: data.created_by,
        assigned_to: data.assigned_to,
      },
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch the created ticket to return it
    const { data: ticket, error: fetchError } = await supabase
      .from("tickets")
      .select("*")
      .eq("created_by", data.created_by)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

