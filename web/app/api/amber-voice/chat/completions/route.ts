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
  const [persona, memory, log] = await Promise.all([
    fs.readFile(path.join(DRAWER_PATH, 'PERSONA.md'), 'utf-8').catch(() => ''),
    fs.readFile(path.join(DRAWER_PATH, 'MEMORY.md'), 'utf-8').catch(() => ''),
    fs.readFile(path.join(DRAWER_PATH, 'LOG.md'), 'utf-8').catch(() => ''),
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
${recentLog}`;

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

    // Convert EVI messages to Claude format
    // Limit to last 4 messages to avoid tool-use format corruption from Hume
    const recentMessages = messages.slice(-4);
    const claudeMessages = recentMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : String(m.content),
    }));

    // Inject context into first user message or prepend
    if (claudeMessages.length > 0 && claudeMessages[0].role === 'user') {
      claudeMessages[0] = {
        role: 'user',
        content: `[Context for this conversation:\n${context}]\n\n${claudeMessages[0].content}`,
      };
    }

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
          // Use recentMessages to match what was actually sent to Claude
          const conversationContent = recentMessages
            .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : '[complex content]'}`)
            .join('\n\n') + `\n\nassistant: ${fullResponse}`;

          // Store voice_session and generate log_entry summary (non-blocking)
          (async () => {
            try {
              // 1. Store raw voice_session
              const { error: sessionError } = await supabase
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
                });

              if (sessionError) {
                console.error('[amber-voice] Failed to store session:', sessionError);
                return;
              }
              console.log('[amber-voice] Stored voice session:', sessionId);

              // 2. Generate summary with Claude (only if conversation has substance)
              if (fullResponse.length > 50) {
                const summaryResponse = await anthropic.messages.create({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 200,
                  system: 'You are summarizing a voice conversation for a personal log. Write a brief 1-2 sentence summary capturing what was discussed and any notable moments. Be concise and personal.',
                  messages: [{
                    role: 'user',
                    content: `Summarize this voice conversation:\n\n${conversationContent}`,
                  }],
                });

                const summary = summaryResponse.content[0].type === 'text'
                  ? summaryResponse.content[0].text
                  : '';

                // 3. Store as log_entry
                const { error: logError } = await supabase
                  .from('amber_state')
                  .insert({
                    type: 'log_entry',
                    content: `## Voice Session\n\n${summary}`,
                    metadata: { session_id: sessionId, source: 'voice' },
                  });

                if (logError) {
                  console.error('[amber-voice] Failed to store log_entry:', logError);
                } else {
                  console.log('[amber-voice] Stored log_entry:', summary.slice(0, 50));
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
