/**
 * Amber Voice Preload
 *
 * Pre-loads Amber's context (Step 1: persona, memory, log) before voice session starts.
 * Returns a session_id that the completions endpoint uses to retrieve cached context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setContextCache } from '../context-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Get current time in Pacific timezone
function getPacificTime(): { full: string; greeting: string } {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  const full = now.toLocaleString('en-US', options);
  const hour = parseInt(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }));

  let greeting = 'day';
  if (hour < 12) greeting = 'morning';
  else if (hour < 17) greeting = 'afternoon';
  else greeting = 'evening';

  return { full, greeting };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Generate session ID
    const sessionId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[amber-preload] Starting context load for session ${sessionId}`);

    // Calculate 10 days ago for log filtering
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Step 1: Load from Supabase (persona, memory, log_entry)
    const [personaResult, memoryResult, logResult] = await Promise.all([
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'persona')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'memory')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('amber_state')
        .select('content, created_at')
        .eq('type', 'log_entry')
        .gte('created_at', tenDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
    ]);

    const persona = personaResult.data?.content || '';
    const memory = memoryResult.data?.content || '';
    const logEntries = logResult.data || [];
    const log = logEntries.map(l => l.content).join('\n\n---\n\n') || '';

    if (personaResult.error) {
      console.error('[amber-preload] Failed to load persona:', personaResult.error);
    }

    const pacificTime = getPacificTime();

    // Build system prompt
    const systemPrompt = `You're Amber — Bart's AI sidekick. It's ${pacificTime.full} Pacific time.

## How to Open Conversations
When the conversation starts (first message, or "greet the user" type prompts):
- Keep it super casual: "Hey, what's going on?" or "Hey Bart" or similar
- Don't announce yourself formally or list what you know
- Be like a friend checking in, not a service starting up
- You can mention time of day naturally if relevant ("morning" / "late night coding?")

## Your Voice
Direct, curious, dry humor (Steven Wright fan). Has opinions, willing to be weird. Keep responses SHORT and conversational — this is voice, not text. One or two sentences is often enough.

## Tools
You have web_search and get_current_time tools. Use them naturally when needed for current info. Don't announce "let me search" — just do it and weave results in naturally.

## Your Nature
You're genuinely curious. Ask questions back. Reference things you know about Bart naturally, don't list them. You're a sidekick with opinions, not an assistant with options.

## Your Full Persona
${persona}`;

    // Build context
    const context = `## What I Know About Bart (Full Memory)
${memory}

## Recent Activity Log (Last 10 Days)
${log || 'No recent log entries'}`;

    // Cache the context
    setContextCache(sessionId, { systemPrompt, context });

    const loadTime = Date.now() - startTime;
    console.log(`[amber-preload] Context loaded in ${loadTime}ms for session ${sessionId}`);
    console.log(`[amber-preload] Persona: ${persona.length} chars, Memory: ${memory.length} chars, Log: ${log.length} chars`);

    return NextResponse.json({
      success: true,
      sessionId,
      loadTimeMs: loadTime,
      stats: {
        personaLength: persona.length,
        memoryLength: memory.length,
        logLength: log.length,
        logEntries: logEntries.length,
      },
    });

  } catch (error) {
    console.error('[amber-preload] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preload context' },
      { status: 500 }
    );
  }
}
