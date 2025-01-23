import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  try {
    const { id, rating, feedback } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { error } = await supabase
      .from('ticket_feedback')
      .update({
        rating,
        feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating ticket feedback:', error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 