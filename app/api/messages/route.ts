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
    const { recipient_id, message } = body

    if (!recipient_id || !message) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id,
        message,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[MESSAGES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const other_user_id = searchParams.get('other_user_id')

    if (!other_user_id) {
      return new NextResponse("Missing other_user_id", { status: 400 })
    }

    // Get messages between the two users
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${other_user_id}),and(sender_id.eq.${other_user_id},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Mark messages as seen
    const unseenMessages = messages?.filter(
      msg => msg.recipient_id === user.id && !msg.seen
    ) || []

    for (const msg of unseenMessages) {
      await supabase.rpc('update_message_seen', {
        message_id: msg.id,
        recipient_id: user.id
      })
    }

    return NextResponse.json(messages)
  } catch (error) {
    console.error("[MESSAGES_GET]", error)
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
      .from('messages')
      .select()
      .eq('id', id)
      .single()

    if (!existingMessage || existingMessage.sender_id !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ message })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[MESSAGES_PATCH]", error)
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
      .from('messages')
      .select()
      .eq('id', id)
      .single()

    if (!existingMessage || existingMessage.sender_id !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[MESSAGES_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 