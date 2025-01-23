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

    // Get all users except the current user
    const { data: users, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, role')
      .neq('user_id', user.id)
      .order('role', { ascending: false }) // Show employees first
      .order('display_name', { ascending: true })

    if (error) {
      console.error("[USERS_SEARCH_ERROR]", error)
      throw error
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error("[USERS_SEARCH_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 