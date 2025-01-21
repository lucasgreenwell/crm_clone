import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { ticketIds, action, status } = await request.json()

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json(
        { error: "Ticket IDs are required" },
        { status: 400 }
      )
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .in("id", ticketIds)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else if (action === 'update' && status) {
      const { error } = await supabase
        .from("tickets")
        .update({ status })
        .in("id", ticketIds)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Fetch the updated tickets to return them
      const { data: tickets, error: fetchError } = await supabase
        .from("tickets")
        .select("*")
        .in("id", ticketIds)

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      return NextResponse.json(tickets)
    }

    return NextResponse.json(
      { error: "Invalid action specified" },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 