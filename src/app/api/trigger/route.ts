/**
 * Agent Trigger API Route
 *
 * Proxies trigger and continuation requests to the Octavus platform and streams
 * responses via SSE. This keeps your API key secure on the server.
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { toSSEStream } from '@octavus/server-sdk';
import { getOctavusClient } from '@/lib/octavus';
import { getAgentConfig } from '@/lib/agents';

/**
 * Tool results echoed back on continuation. Mirrors the SDK's `ToolResult` so
 * every field survives the round-trip - most importantly `error` (set when a
 * client tool is cancelled or throws) and the worker/thread routing fields -
 * rather than being silently dropped by validation.
 */
const fileReferenceSchema = z.object({
  id: z.string(),
  mediaType: z.string(),
  url: z.string(),
  filename: z.string().optional(),
  size: z.number().optional(),
});

const toolResultSchema = z.object({
  toolCallId: z.string().min(1),
  toolName: z.string().optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  files: z.array(fileReferenceSchema).optional(),
  outputVariable: z.string().optional(),
  blockIndex: z.number().optional(),
  thread: z.string().optional(),
  workerId: z.string().optional(),
});

/** Trigger a new agent turn */
const triggerRequestSchema = z.object({
  sessionId: z.string().min(1),
  agentId: z.string().min(1),
  type: z.literal('trigger'),
  triggerName: z.string().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
});

/** Continue execution after client-side tool handling */
const continueRequestSchema = z.object({
  sessionId: z.string().min(1),
  agentId: z.string().min(1),
  type: z.literal('continue'),
  executionId: z.string().min(1),
  toolResults: z.array(toolResultSchema).min(1),
});

/** Combined schema for all request types */
const requestBodySchema = z.discriminatedUnion('type', [
  triggerRequestSchema,
  continueRequestSchema,
]);

/**
 * POST /api/trigger - Handle agent requests (trigger or continuation)
 *
 * Request body:
 * - Trigger: { sessionId, agentId, type: 'trigger', triggerName, input? }
 * - Continue: { sessionId, agentId, type: 'continue', executionId, toolResults }
 *
 * Response: SSE stream of agent events
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = requestBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sessionId, agentId, ...sessionRequest } = parsed.data;

    const client = getOctavusClient();

    // Get agent-specific tool handlers
    const agentConfig = getAgentConfig(agentId);

    // Attach to session with agent-specific tools
    const session = client.agentSessions.attach(sessionId, {
      tools: agentConfig?.tools ?? {},
    });

    // execute() handles both triggers and client tool continuations
    const events = session.execute(sessionRequest, {
      signal: request.signal,
    });

    return new Response(toSSEStream(events), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Trigger error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
