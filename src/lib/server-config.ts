import 'server-only';

import { DEFAULT_BASE_URL } from '@octavus/server-sdk';

/**
 * Get the Octavus platform URL for server-side code.
 */
export function getOctavusPlatformUrl(): string {
  return process.env.OCTAVUS_API_URL ?? DEFAULT_BASE_URL;
}

/**
 * Get the Octavus API key.
 * Required for making API calls to the platform.
 */
export function getOctavusApiKey(): string {
  const apiKey = process.env.OCTAVUS_API_KEY;
  if (!apiKey) {
    throw new Error('OCTAVUS_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Get the default agent ID for this application.
 * Configure in OCTAVUS_AGENT_ID environment variable.
 */
export function getDefaultAgentId(): string {
  const agentId = process.env.OCTAVUS_AGENT_ID;
  if (!agentId) {
    throw new Error('OCTAVUS_AGENT_ID environment variable is not set');
  }
  return agentId;
}
