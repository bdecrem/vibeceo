/**
 * Simple in-memory cache for pre-loaded Amber context.
 *
 * Uses a "current session" approach since there's typically only one
 * voice chat active at a time. The preload sets the current context,
 * and the completions endpoint reads it.
 *
 * This works because the voice endpoint runs on Node.js runtime (not edge).
 */

interface CachedContext {
  systemPrompt: string;
  context: string;
  timestamp: number;
  sessionId: string;
}

// Single current session
let currentSession: CachedContext | null = null;

// 10 minute TTL
const TTL_MS = 10 * 60 * 1000;

export function setContextCache(
  sessionId: string,
  data: { systemPrompt: string; context: string }
): void {
  currentSession = {
    ...data,
    timestamp: Date.now(),
    sessionId,
  };
  console.log(`[context-cache] Set current session: ${sessionId}`);
}

export function getContextCache(
  sessionId?: string
): { systemPrompt: string; context: string } | null {
  if (!currentSession) {
    console.log(`[context-cache] No current session`);
    return null;
  }

  // Check if expired
  if (Date.now() - currentSession.timestamp > TTL_MS) {
    console.log(`[context-cache] Current session expired: ${currentSession.sessionId}`);
    currentSession = null;
    return null;
  }

  console.log(`[context-cache] Using current session: ${currentSession.sessionId}`);
  return {
    systemPrompt: currentSession.systemPrompt,
    context: currentSession.context,
  };
}

export function clearContextCache(): void {
  currentSession = null;
}
