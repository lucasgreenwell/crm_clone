import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { messageIds } = await request.json()
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'messageIds must be a non-empty array' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user's ID for security check
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update seen status for all messages where the current user is the recipient
    console.log("messageIds", messageIds, "user.id", user.id)
    const { error } = await supabase
      .from('messages')
      .update({ seen: true })
      .in('id', messageIds)

    if (error) {
      console.error('Error updating seen status:', error)
      return NextResponse.json(
        { error: 'Failed to update seen status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in seen messages route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 