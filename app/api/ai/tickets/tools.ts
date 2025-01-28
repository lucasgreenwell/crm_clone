import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { createTicket, updateTicket, deleteTicket } from "./functions"

export const createTicketTool = new DynamicStructuredTool({
  name: "create_ticket",
  description: "Create a new support ticket in the system",
  schema: z.object({
    subject: z.string().describe("The subject/title of the ticket"),
    description: z.string().optional().describe("Detailed description of the ticket"),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe("Priority level of the ticket"),
    status: z.enum(['open', 'pending', 'resolved', 'closed']).optional().describe("Current status of the ticket"),
    channel: z.enum(['web', 'email', 'chat', 'social', 'sms', 'phone']).optional().describe("Channel through which the ticket was created"),
    team_id: z.string().optional().describe("ID of the team to assign the ticket to"),
    assigned_to: z.string().optional().describe("ID of the agent to assign the ticket to")
  }),
  func: async ({ subject, description, priority, status, channel, team_id, assigned_to }) => {
    try {
      const ticket = await createTicket({
        subject,
        description,
        priority,
        status,
        channel,
        team_id,
        assigned_to
      })
      return JSON.stringify(ticket)
    } catch (error: any) {
      return `Error creating ticket: ${error.message || 'Unknown error'}`
    }
  }
})

export const updateTicketTool = new DynamicStructuredTool({
  name: "update_ticket",
  description: "Update an existing support ticket in the system",
  schema: z.object({
    ticket_id: z.string().describe("The ID of the ticket to update"),
    subject: z.string().optional().describe("New subject/title of the ticket"),
    description: z.string().optional().describe("New description of the ticket"),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe("New priority level"),
    status: z.enum(['open', 'pending', 'resolved', 'closed']).optional().describe("New status"),
    team_id: z.string().optional().describe("New team assignment"),
    assigned_to: z.string().optional().describe("New agent assignment")
  }),
  func: async ({ ticket_id, subject, description, priority, status, team_id, assigned_to }) => {
    try {
      const ticket = await updateTicket({
        ticket_id,
        subject,
        description,
        priority,
        status,
        team_id,
        assigned_to
      })
      return JSON.stringify(ticket)
    } catch (error: any) {
      return `Error updating ticket: ${error.message || 'Unknown error'}`
    }
  }
})

export const deleteTicketTool = new DynamicStructuredTool({
  name: "delete_ticket",
  description: "Delete an existing support ticket from the system (admin only)",
  schema: z.object({
    ticket_id: z.string().describe("The ID of the ticket to delete")
  }),
  func: async ({ ticket_id }) => {
    try {
      const result = await deleteTicket(ticket_id)
      return JSON.stringify(result)
    } catch (error: any) {
      return `Error deleting ticket: ${error.message || 'Unknown error'}`
    }
  }
}) 
