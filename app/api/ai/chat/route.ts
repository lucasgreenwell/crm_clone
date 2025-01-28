import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { createTicketTool, updateTicketTool, deleteTicketTool } from "../tickets/tools"
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents"
import { RunnableSequence } from "@langchain/core/runnables"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { AIMessage, HumanMessage } from "@langchain/core/messages"

const model = new ChatOpenAI({
  modelName: "gpt-4-turbo-preview",
  temperature: 0
})

// Create the agent with our tools
const tools = [createTicketTool, updateTicketTool, deleteTicketTool]

const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an AI assistant for a CRM system. You can help with customer service, ticket management, and general inquiries. 
  Users may attach tickets, messages, profiles, teams, and templates to their messages for context. These entities from our database will be referenced with special span tags.

  When you create or update a ticket, you should reference it in your response using a span tag with this format:
  <span class="entity-ticket" id="TICKET_ID" href="/employee/tickets?ticket=TICKET_ID">ticket-FIRST_8_CHARS_OF_ID</span>

  For example, if you create a ticket with ID "123e4567-e89b-12d3-a456-426614174000", you should reference it as:
  <span class="entity-ticket" id="123e4567-e89b-12d3-a456-426614174000" href="/employee/tickets?ticket=123e4567-e89b-12d3-a456-426614174000">ticket-123e4567</span>

  Never include the full JSON data of tickets in your responses as this is not useful for users. Instead, always use the span format above and describe the relevant details in natural language.

  You have access to tools that allow you to create, update, and delete tickets. Use these tools when appropriate based on the user's request.
  Always be professional, helpful, and concise in your responses.
  When using tools, make sure to handle any errors appropriately and communicate them clearly to the user.`],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
])

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt
    })

    const agentExecutor = new AgentExecutor({
      agent,
      tools
    })

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

    // Process content to replace entity spans with actual data for AI context
    let processedContent = content
    const spanRegex = /<span class="entity-(\w+)" id="([^"]+)">[^<]+<\/span>/g
    const matches = [...content.matchAll(spanRegex)]

    for (const match of matches) {
      const [fullMatch, type, id] = match
      let entityData

      switch (type) {
        case 'ticket':
          entityData = entityMaps.ticket[id]
          if (entityData) {
            processedContent = processedContent.replace(
              fullMatch,
              `\nTicket: ${JSON.stringify(entityData, null, 2)}\n`
            )
          }
          break
        case 'message':
          entityData = entityMaps.message[id]
          if (entityData) {
            processedContent = processedContent.replace(
              fullMatch,
              `\nMessage: ${JSON.stringify(entityData, null, 2)}\n`
            )
          }
          break
        case 'customer':
        case 'employee':
          entityData = entityMaps.profile[id]
          if (entityData) {
            processedContent = processedContent.replace(
              fullMatch,
              `\n${type.charAt(0).toUpperCase() + type.slice(1)}: ${JSON.stringify(entityData, null, 2)}\n`
            )
          }
          break
        case 'template':
          entityData = entityMaps.template[id]
          if (entityData) {
            processedContent = processedContent.replace(
              fullMatch,
              `\nTemplate: ${JSON.stringify(entityData, null, 2)}\n`
            )
          }
          break
        case 'team':
          entityData = entityMaps.team[id]
          if (entityData) {
            processedContent = processedContent.replace(
              fullMatch,
              `\nTeam: ${JSON.stringify(entityData, null, 2)}\n`
            )
          }
          break
      }
    }

    // Get conversation history
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

    // Format conversation history for LangChain
    const chatHistory = conversationHistory.map(msg => 
      msg.is_ai ? new AIMessage(msg.content) : new HumanMessage(msg.content)
    )

    // Execute the agent
    const result = await agentExecutor.invoke({
      input: processedContent,
      chat_history: chatHistory
    })

    // Store user message
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

    // Store AI response
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        content: result.output,
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