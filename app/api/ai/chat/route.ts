import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const { content, conversationId } = json

    if (!content) {
      return new NextResponse("Message content is required", { status: 400 })
    }

    // Store user message
    const { data: userMessage, error: userMessageError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        content,
        user_id: session.user.id,
        is_ai: false
      })
      .select()
      .single()

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError)
      return new NextResponse("Error storing message", { status: 500 })
    }

    // Get conversation history for context
    const { data: conversationHistory, error: historyError } = await supabase
      .from('ai_messages')
      .select('content, is_ai')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10) // Limit to last 10 messages for context

    if (historyError) {
      console.error('Error fetching conversation history:', historyError)
      return new NextResponse("Error fetching conversation history", { status: 500 })
    }

    // Format conversation history for OpenAI
    const messages = conversationHistory.map(msg => ({
      role: msg.is_ai ? 'assistant' as const : 'user' as const,
      content: msg.content
    }))

    // Add system message
    messages.unshift({
      role: 'system' as const,
      content: `You are an AI assistant for a CRM system. You can help with customer service, ticket management, and general inquiries. 
      You have access to information about tickets, messages, profiles, teams, and templates through the IDs provided in each message.
      Always be professional, helpful, and concise in your responses.`
    })

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0
    })

    const aiResponse = completion.choices[0].message.content

    if (!aiResponse) {
      return new NextResponse("No response from AI", { status: 500 })
    }

    // Store AI response
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        content: aiResponse,
        is_ai: true
      })
      .select()
      .single()

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError)
      return new NextResponse("Error storing AI response", { status: 500 })
    }

    return NextResponse.json(aiMessage)
  } catch (error) {
    console.error('Error in AI chat route:', error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 