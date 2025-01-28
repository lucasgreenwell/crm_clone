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
    const { 
      content, 
      conversationId, 
      ticket_ids = [],
      message_ids = [],
      profile_ids = [],
      template_ids = [],
      team_ids = []
    } = json

    if (!content) {
      return new NextResponse("Message content is required", { status: 400 })
    }

    // Fetch all referenced entities
    const [ticketResults, messageResults, profileResults, templateResults, teamResults] = await Promise.all([
      ticket_ids.length > 0 ? 
        supabase.from('tickets').select('*').in('id', ticket_ids) : 
        { data: [] },
      message_ids.length > 0 ? 
        supabase.from('messages').select('*').in('id', message_ids) : 
        { data: [] },
      profile_ids.length > 0 ? 
        supabase.from('profiles').select('*').in('user_id', profile_ids) : 
        { data: [] },
      template_ids.length > 0 ? 
        supabase.from('templates').select('*').in('id', template_ids) : 
        { data: [] },
      team_ids.length > 0 ? 
        supabase.from('teams').select('*').in('id', team_ids) : 
        { data: [] }
    ])

    // Create lookup maps for each entity type
    const entityMaps = {
      ticket: Object.fromEntries((ticketResults.data || []).map(t => [t.id, t])),
      message: Object.fromEntries((messageResults.data || []).map(m => [m.id, m])),
      profile: Object.fromEntries((profileResults.data || []).map(p => [p.user_id, p])),
      template: Object.fromEntries((templateResults.data || []).map(t => [t.id, t])),
      team: Object.fromEntries((teamResults.data || []).map(t => [t.id, t]))
    }

    // Process content to replace entity spans with actual data
    let processedContent = content
    const spanRegex = /<span class="entity-(\w+)" id="([^"]+)">[^<]+<\/span>/g
    const matches = [...content.matchAll(spanRegex)]

    for (const match of matches) {
      const [fullMatch, type, id] = match
      let entityData

      // Get entity from the appropriate map
      switch (type) {
        case 'ticket':
          entityData = entityMaps.ticket[id]
          break
        case 'message':
          entityData = entityMaps.message[id]
          break
        case 'customer':
        case 'employee':
          entityData = entityMaps.profile[id]
          break
        case 'template':
          entityData = entityMaps.template[id]
          break
        case 'team':
          entityData = entityMaps.team[id]
          break
      }

      if (entityData) {
        processedContent = processedContent.replace(
          fullMatch,
          `@${type}-${id.slice(0, 8)} (${type.charAt(0).toUpperCase() + type.slice(1)} Data: ${JSON.stringify(entityData, null, 2)})`
        )
      }
    }

    // Store user message with original content (with spans)
    const { data: userMessage, error: userMessageError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        content,
        user_id: session.user.id,
        is_ai: false,
        ticket_ids,
        message_ids,
        profile_ids,
        template_ids,
        team_ids
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
      .limit(10)

    if (historyError) {
      console.error('Error fetching conversation history:', historyError)
      return new NextResponse("Error fetching conversation history", { status: 500 })
    }

    // Format conversation history for OpenAI, using processedContent for the latest message
    const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = conversationHistory.map((msg, index) => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: index === conversationHistory.length - 1 ? processedContent : msg.content
    }))

    // Add system message
    chatMessages.unshift({
      role: 'system',
      content: `You are an AI assistant for a CRM system. You can help with customer service, ticket management, and general inquiries. 
      Users may attach tickets, messages, profiles, teams, and templates to their messages for context. These entities are from our database and will appear as JSON objects in the users message to you.
      Always be professional, helpful, and concise in your responses.`
    })

    console.log(chatMessages)

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: chatMessages,
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