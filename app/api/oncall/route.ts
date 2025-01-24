import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { userId } = await request.json()

    if (!userId) {
      return new NextResponse("Missing user ID", { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_oncall: true })
      .eq('user_id', userId)

    if (error) throw error

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error("[ONCALL_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 