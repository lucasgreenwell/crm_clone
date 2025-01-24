import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { sendTemplateEmail } from "@/app/utils/email"

interface Profile {
  display_name: string
  email: string
}

interface CurrentTicket {
  status: string
  subject: string
  created_by: string
  profiles: Profile
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating ticket:', error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ticket = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if the status is being updated
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        status, 
        subject,
        created_by,
        profiles:profiles!created_by (
          display_name,
          email
        )
      `)
      .eq('id', ticket.id)
      .single()

    if (ticketError) {
      console.error('Error fetching current ticket:', ticketError)
      throw ticketError
    }

    // Transform the data to match our interface
    const currentTicket: CurrentTicket = {
      status: ticketData.status,
      subject: ticketData.subject,
      created_by: ticketData.created_by,
      profiles: ticketData.profiles
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(ticket)
      .eq('id', ticket.id)
      .select()
      .single()

    if (updateError) throw updateError

    // If status has changed, send email notification
    console.log('Current ticket:', currentTicket, 'Email:', currentTicket?.profiles?.email, 'Old status:', currentTicket?.status, 'New status:', ticket.status)
    if (
      currentTicket &&
      currentTicket.status !== ticket.status &&
      currentTicket.profiles?.email // Make sure we have the user's email
    ) {
      const emailSent = await sendTemplateEmail({
        to: currentTicket.profiles.email,
        templateId: process.env.SENDGRID_STATUS_UPDATE_TEMPLATE_ID!,
        dynamicTemplateData: {
          user_name: currentTicket.profiles.display_name,
          ticket_subject: currentTicket.subject,
          ticket_status: ticket.status,
        },
      })

      if (!emailSent) {
        console.error('Failed to send status update email for ticket:', ticket.id)
      }
    }

    // If status is being changed to resolved or closed, create feedback entry
    if (
      currentTicket &&
      currentTicket.status !== ticket.status &&
      (ticket.status === 'resolved' || ticket.status === 'closed')
    ) {
      const { error: feedbackError } = await supabase
        .from('ticket_feedback')
        .insert({
          ticket_id: ticket.id,
          created_by: currentTicket.created_by,
          rating: null,
          feedback: null,
        })

      if (feedbackError) {
        console.error('Error creating feedback entry:', feedbackError)
      }
    }

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

