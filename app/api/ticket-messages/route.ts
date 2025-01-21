import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { ticket_id, message, internal_only } = body

    if (!ticket_id || !message) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id,
        sender_id: user.id,
        message,
        internal_only: internal_only || false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[TICKET_MESSAGES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { id, message } = body

    if (!id || !message) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Verify ownership
    const { data: existingMessage } = await supabase
      .from('ticket_messages')
      .select()
      .eq('id', id)
      .single()

    if (!existingMessage || existingMessage.sender_id !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data, error } = await supabase
      .from('ticket_messages')
      .update({ message })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[TICKET_MESSAGES_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return new NextResponse("Missing message id", { status: 400 })
    }

    // Verify ownership
    const { data: existingMessage } = await supabase
      .from('ticket_messages')
      .select()
      .eq('id', id)
      .single()

    if (!existingMessage || existingMessage.sender_id !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { error } = await supabase
      .from('ticket_messages')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[TICKET_MESSAGES_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 