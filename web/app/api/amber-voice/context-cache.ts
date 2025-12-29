/**
 * Simple in-memory cache for pre-loaded Amber context.
 *
 * Context is cached by session ID with a 10-minute TTL.
 * This works because the voice endpoint runs on Node.js runtime (not edge).
 */

interface CachedContext {
  systemPrompt: string;
  context: string;
  timestamp: number;
}

const cache = new Map<string, CachedContext>();

// 10 minute TTL
const TTL_MS = 10 * 60 * 1000;

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > TTL_MS) {
      cache.delete(key);
      console.log(`[context-cache] Expired session: ${key}`);
    }
  }
}, 60 * 1000); // Check every minute

export function setContextCache(
  sessionId: string,
  data: { systemPrompt: string; context: string }
): void {
  cache.set(sessionId, {
    ...data,
    timestamp: Date.now(),
  });
  console.log(`[context-cache] Cached context for session: ${sessionId}`);
}

export function getContextCache(
  sessionId: string
): { systemPrompt: string; context: string } | null {
  const entry = cache.get(sessionId);

  if (!entry) {
    console.log(`[context-cache] No cache for session: ${sessionId}`);
    return null;
  }

  // Check if expired
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(sessionId);
    console.log(`[context-cache] Expired on access: ${sessionId}`);
    return null;
  }

  console.log(`[context-cache] Hit for session: ${sessionId}`);
  return {
    systemPrompt: entry.systemPrompt,
    context: entry.context,
  };
}

export function clearContextCache(sessionId: string): void {
  cache.delete(sessionId);
}
