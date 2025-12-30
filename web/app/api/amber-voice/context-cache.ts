/**
 * Simple in-memory cache for pre-loaded Amber context.
 *
 * Uses globalThis to persist across Next.js module recompilations.
 * The preload sets the current context, and the completions endpoint reads it.
 */

interface CachedContext {
  systemPrompt: string;
  context: string;
  timestamp: number;
  sessionId: string;
}

// Use globalThis to survive module recompilations in Next.js dev mode
const globalCache = globalThis as typeof globalThis & {
  __amberContextCache?: CachedContext | null;
};

// 10 minute TTL
const TTL_MS = 10 * 60 * 1000;

export function setContextCache(
  sessionId: string,
  data: { systemPrompt: string; context: string }
): void {
  globalCache.__amberContextCache = {
    ...data,
    timestamp: Date.now(),
    sessionId,
  };
  console.log(`[context-cache] Set current session: ${sessionId}`);
}

export function getContextCache(
  sessionId?: string
): { systemPrompt: string; context: string } | null {
  const cached = globalCache.__amberContextCache;
  if (!cached) {
    console.log(`[context-cache] No current session`);
    return null;
  }

  // Check if expired
  if (Date.now() - cached.timestamp > TTL_MS) {
    console.log(`[context-cache] Current session expired: ${cached.sessionId}`);
    globalCache.__amberContextCache = null;
    return null;
  }

  console.log(`[context-cache] Using current session: ${cached.sessionId}`);
  return {
    systemPrompt: cached.systemPrompt,
    context: cached.context,
  };
}

export function clearContextCache(): void {
  globalCache.__amberContextCache = null;
}
