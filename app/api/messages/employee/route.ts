import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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
    const customer_id = searchParams.get('customer_id')

    if (!other_user_id || !customer_id) {
      return new NextResponse("Missing required parameters", { status: 400 })
    }

    // Verify that the requesting user is an employee
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['agent', 'admin'].includes(profile.role)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get messages between the employee and customer
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${customer_id},recipient_id.eq.${other_user_id}),and(sender_id.eq.${other_user_id},recipient_id.eq.${customer_id})`)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(messages)
  } catch (error) {
    console.error("[EMPLOYEE_MESSAGES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 