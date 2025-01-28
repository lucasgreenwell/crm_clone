import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    if (!type) {
      return new NextResponse("Entity type is required", { status: 400 })
    }

    let data
    let error

    switch (type) {
      case 'ticket':
        ({ data, error } = await supabase
          .from('tickets')
          .select('id, subject, status, priority')
          .order('created_at', { ascending: false })
          .limit(50))
        break

      case 'message':
        ({ data, error } = await supabase
          .from('messages')
          .select('id, message, sender_id, recipient_id')
          .order('created_at', { ascending: false })
          .limit(50))
        break

      case 'customer':
        ({ data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .eq('role', 'customer')
          .order('created_at', { ascending: false })
          .limit(50))
        break

      case 'employee':
        ({ data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('role', ['agent', 'admin'])
          .order('created_at', { ascending: false })
          .limit(50))
        break

      case 'template':
        ({ data, error } = await supabase
          .from('templates')
          .select('id, name')
          .order('created_at', { ascending: false })
          .limit(50))
        break

      case 'team':
        ({ data, error } = await supabase
          .from('teams')
          .select('id, name, focus_area')
          .order('created_at', { ascending: false })
          .limit(50))
        break

      default:
        return new NextResponse("Invalid entity type", { status: 400 })
    }

    if (error) {
      console.error(`Error fetching ${type}:`, error)
      return new NextResponse("Error fetching entities", { status: 500 })
    }

    // For profiles, map user_id to id to maintain consistent interface
    if (data && (type === 'customer' || type === 'employee')) {
      data = data.map(profile => {
        if ('user_id' in profile) {
          return {
            ...profile,
            id: profile.user_id
          }
        }
        return profile
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in entities route:', error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 