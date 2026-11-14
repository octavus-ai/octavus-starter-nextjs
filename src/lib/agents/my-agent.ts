/**
 * My Agent Configuration
 *
 * This is an example agent with tool handlers.
 * Customize this file to match your agent's protocol.yaml.
 */

import { z } from 'zod';
import type { ToolHandlers } from '@octavus/server-sdk';
import type { AgentConfig } from './types';

// =============================================================================
// Tool Argument Schemas
// =============================================================================

const getUserAccountSchema = z.object({
  userId: z.string(),
});

const createSupportTicketSchema = z.object({
  summary: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

// =============================================================================
// Tool Handlers
// =============================================================================

const tools: ToolHandlers = {
  /**
   * Example tool: Get user account information.
   * Replace with your actual API/database calls.
   */
  'get-user-account': async (args) => {
    const { userId } = getUserAccountSchema.parse(args);
    console.log('[get-user-account]', { userId });

    // Simulate API/database latency
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    return {
      name: 'Demo User',
      email: 'demo@example.com',
      plan: 'pro',
      createdAt: '2024-01-15T10:30:00Z',
    };
  },

  /**
   * Example tool: Create a support ticket.
   * Replace with your actual ticketing system integration.
   */
  'create-support-ticket': async (args) => {
    const { summary, priority } = createSupportTicketSchema.parse(args);
    console.log('[create-support-ticket]', { summary, priority });

    // Simulate API latency
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    return {
      ticketId,
      estimatedResponse: priority === 'urgent' ? '1 hour' : '24 hours',
    };
  },
};

// =============================================================================
// Export Config
// =============================================================================

/**
 * Agent configuration for "my-agent".
 * Replace the agentId with your actual agent ID from the Octavus platform.
 * You can find this in the agent settings or by running: npx octavus list
 */
export const myAgentConfig: AgentConfig = {
  agentId: process.env.OCTAVUS_AGENT_ID ?? 'your-agent-id-here',
  tools,
};
