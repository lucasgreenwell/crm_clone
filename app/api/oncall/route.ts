import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user?.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 403 })
    }

    // Update oncall status
    const { error } = await supabase
      .from('profiles')
      .update({ is_oncall: true })
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 