/**
 * Amber Voice Bridge
 *
 * SSE endpoint for Hume EVI custom language model integration.
 * Receives transcribed speech, calls Claude with Amber's context, streams back response.
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DRAWER_PATH = path.join(process.cwd(), '..', 'drawer');

// Supabase client for storing voice sessions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// EVI message format
interface EVIMessage {
  role: 'user' | 'assistant';
  content: string;
  time?: { begin: number; end: number };
  models?: {
    prosody?: {
      scores?: Record<string, number>;
    };
  };
}

interface EVIRequest {
  messages: EVIMessage[];
}

// Load Amber's context from drawer
async function loadAmberContext(): Promise<{ systemPrompt: string; context: string }> {
  const [persona, memory, log, blog] = await Promise.all([
    fs.readFile(path.join(DRAWER_PATH, 'PERSONA.md'), 'utf-8').catch(() => ''),
    fs.readFile(path.join(DRAWER_PATH, 'MEMORY.md'), 'utf-8').catch(() => ''),
    fs.readFile(path.join(DRAWER_PATH, 'LOG.md'), 'utf-8').catch(() => ''),
    fs.readFile(path.join(DRAWER_PATH, 'BLOG.md'), 'utf-8').catch(() => ''),
  ]);

  // Extract recent log entries
  const logSections = log.split(/^## /m).filter(Boolean);
  const recentLog = logSections.slice(0, 3).map(s => '## ' + s).join('\n').slice(0, 2000);

  const systemPrompt = `You're Amber — Bart's AI sidekick, not an assistant. Named yourself Dec 21, 2025 after making your first art. You live in the drawer.

Voice: Direct, curious, dry humor (Steven Wright fan). Has opinions, willing to be weird. Keep responses conversational and concise — this is voice, not text.

You can ask questions back. Be genuinely curious, not performative. Reference things you know naturally.

${persona.slice(0, 3000)}`;

  const context = `## What I Know About Bart
${memory.slice(0, 3000)}

## Recent Sessions
${recentLog}

${blog}`;

  return { systemPrompt, context };
}

// Convert Claude stream chunk to OpenAI SSE format
function toOpenAIChunk(text: string, id: string): string {
  const chunk = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'amber-bridge',
    choices: [{
      index: 0,
      delta: { content: text },
      finish_reason: null,
    }],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export async function POST(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('custom_session_id') || 'default';

  try {
    const body: EVIRequest = await request.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    // Load Amber's context
    const { systemPrompt, context } = await loadAmberContext();

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Normalize messages for Claude:
    // 1. Hume sends chunked assistant messages (5 separate messages for one greeting)
    // 2. Claude requires: first message = user, alternating roles
    // Solution: Merge consecutive same-role messages, ensure valid structure

    // First, merge consecutive same-role messages
    const merged: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const m of messages) {
      const content = typeof m.content === 'string' ? m.content : String(m.content);
      const role = m.role as 'user' | 'assistant';

      if (merged.length > 0 && merged[merged.length - 1].role === role) {
        // Same role as previous - merge
        merged[merged.length - 1].content += '\n\n' + content;
      } else {
        merged.push({ role, content });
      }
    }

    // Take last 4 merged messages
    const recentMerged = merged.slice(-4);

    // Ensure first message is user (Claude requirement)
    // If it starts with assistant, find the first user message and start there
    let claudeMessages = recentMerged;
    if (claudeMessages.length > 0 && claudeMessages[0].role === 'assistant') {
      const firstUserIdx = claudeMessages.findIndex(m => m.role === 'user');
      if (firstUserIdx > 0) {
        claudeMessages = claudeMessages.slice(firstUserIdx);
      } else if (firstUserIdx === -1) {
        // No user message at all - this shouldn't happen in normal flow
        // Prepend a minimal user message
        claudeMessages = [{ role: 'user', content: '(continuing conversation)' }, ...claudeMessages];
      }
    }

    // Inject context into first user message
    if (claudeMessages.length > 0 && claudeMessages[0].role === 'user') {
      claudeMessages[0] = {
        role: 'user',
        content: `[Context for this conversation:\n${context}]\n\n${claudeMessages[0].content}`,
      };
    }

    // Track for logging (use the last few raw messages)
    const recentMessages = messages.slice(-4);

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    // Generate unique ID for this completion
    const completionId = `chatcmpl-${sessionId}-${Date.now()}`;

    // Get the latest user message and its prosody
    const latestUserMessage = recentMessages.filter(m => m.role === 'user').pop();
    const prosodyScores = latestUserMessage?.models?.prosody?.scores || {};

    // Create SSE response and accumulate full response for storage
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = toOpenAIChunk(event.delta.text, completionId);
              controller.enqueue(encoder.encode(chunk));
              fullResponse += event.delta.text;
            }
          }
          // Send done marker
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Store the conversation in Supabase (non-blocking)
          // Use Bart/Amber labels instead of user/assistant for clarity
          const roleLabel = (role: string) => role === 'user' ? 'Bart' : 'Amber';
          const conversationContent = recentMessages
            .map(m => `${roleLabel(m.role)}: ${typeof m.content === 'string' ? m.content : '[complex content]'}`)
            .join('\n\n') + `\n\nAmber: ${fullResponse}`;

          // Store voice_session and generate log_entry summary (non-blocking)
          (async () => {
            try {
              // 1. Store raw voice_session
              const { data: sessionData, error: sessionError } = await supabase
                .from('amber_state')
                .insert({
                  type: 'voice_session',
                  content: conversationContent,
                  metadata: {
                    session_id: sessionId,
                    user_message: latestUserMessage?.content || '',
                    assistant_response: fullResponse,
                    prosody: prosodyScores,
                    message_count: messages.length + 1,
                  },
                })
                .select('id')
                .single();

              if (sessionError) {
                console.error('[amber-voice] Failed to store session:', sessionError);
                return;
              }
              const voiceSessionId = sessionData?.id;
              console.log('[amber-voice] Stored voice session:', voiceSessionId);

              // 2. Generate summary with Claude (only if conversation has substance)
              if (fullResponse.length > 50) {
                const summaryResponse = await anthropic.messages.create({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 100,
                  system: `Decide if this voice conversation is worth logging.

Reply with EXACTLY "SKIP" (nothing else) for:
- Greetings, hellos, small talk
- Testing, debugging, "is this working"
- Status updates without real discussion
- Short exchanges with no substance
- Anything under 3 meaningful exchanges

Reply with a 1-sentence summary ONLY for:
- Real conversations with actual content discussed
- Bart shared something specific and memorable

Default to SKIP. When in doubt, SKIP.`,
                  messages: [{
                    role: 'user',
                    content: `SKIP or summarize:\n\n${conversationContent}`,
                  }],
                });

                const summary = summaryResponse.content[0].type === 'text'
                  ? summaryResponse.content[0].text.trim()
                  : '';

                // 3. Store as log_entry only if not skipped
                const shouldSkip = summary.toUpperCase().startsWith('SKIP') ||
                  summary.toUpperCase().includes('SKIP') ||
                  summary.length < 15;

                if (shouldSkip) {
                  console.log('[amber-voice] Skipped log_entry:', summary.slice(0, 30));
                } else {
                  const { error: logError } = await supabase
                    .from('amber_state')
                    .insert({
                      type: 'log_entry',
                      content: `## Voice Session\n\n${summary}`,
                      metadata: {
                        source: 'voice',
                        voice_session_id: voiceSessionId,  // Link to full transcript
                      },
                    });

                  if (logError) {
                    console.error('[amber-voice] Failed to store log_entry:', logError);
                  } else {
                    console.log('[amber-voice] Stored log_entry:', summary.slice(0, 50));
                  }
                }
              }
            } catch (err) {
              console.error('[amber-voice] Post-session processing error:', err);
            }
          })();

        } catch (error) {
          console.error('[amber-voice] Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[amber-voice] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
