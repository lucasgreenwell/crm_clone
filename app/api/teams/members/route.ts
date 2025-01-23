import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AddTeamMemberRequest, RemoveTeamMemberRequest } from '@/app/types/team'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body: AddTeamMemberRequest = await request.json()
    
    // Check if user is already a member of the team
    const { data: existingMember } = await supabase
      .from('team_members')
      .select()
      .eq('team_id', body.team_id)
      .eq('user_id', body.user_id)
      .single()

    if (existingMember) {
      return new NextResponse('User is already a member of this team', { status: 400 })
    }

    // Add user to team
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: body.team_id,
        user_id: body.user_id,
        role: body.role || 'member'
      })
      .select()
      .single()

    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error adding team member:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')
    const userId = searchParams.get('user_id')
    
    if (!teamId || !userId) {
      return new NextResponse('Team ID and User ID are required', { status: 400 })
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) throw error
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error removing team member:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 