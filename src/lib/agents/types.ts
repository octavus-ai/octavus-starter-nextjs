import type { ToolHandlers } from '@octavus/server-sdk';

/**
 * Configuration for an agent.
 * Includes the tool handlers the agent can call.
 */
export interface AgentConfig {
  /** The agent ID from the Octavus platform */
  agentId: string;
  tools: ToolHandlers;
}

export type AgentConfigRegistry = Record<string, AgentConfig>;
