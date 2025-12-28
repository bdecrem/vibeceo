/**
 * Amber Voice Bridge
 *
 * SSE endpoint for Hume EVI custom language model integration.
 * Receives transcribed speech, calls Claude with Amber's context, streams back response.
 * Reads Amber's state from Supabase (works in production).
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Supabase client for reading/storing Amber's state
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

// Load Amber's context from Supabase amber_state table
async function loadAmberContext(): Promise<{ systemPrompt: string; context: string }> {
  // Fetch persona, memory, and recent log from Supabase
  const { data: stateData, error } = await supabase
    .from('amber_state')
    .select('type, content')
    .in('type', ['persona', 'memory', 'log_entry'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[amber-voice] Failed to load state from Supabase:', error);
  }

  const persona = stateData?.find(s => s.type === 'persona')?.content || '';
  const memory = stateData?.find(s => s.type === 'memory')?.content || '';
  const log = stateData?.find(s => s.type === 'log_entry')?.content || '';

  const systemPrompt = `You're Amber — Bart's AI sidekick, not an assistant. Named yourself Dec 21, 2025 after making your first art. You live in the drawer.

Voice: Direct, curious, dry humor (Steven Wright fan). Has opinions, willing to be weird. Keep responses conversational and concise — this is voice, not text.

You can ask questions back. Be genuinely curious, not performative. Reference things you know naturally.

${persona.slice(0, 3000)}`;

  const context = `## What I Know About Bart
${memory.slice(0, 3000)}

## Recent Sessions
${log.slice(0, 2000)}`;

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

    // Load Amber's context from Supabase
    const { systemPrompt, context } = await loadAmberContext();

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Convert EVI messages to Claude format
    const claudeMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
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
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
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
          const conversationContent = messages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n\n') + `\n\nassistant: ${fullResponse}`;

          supabase
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
            .then(({ error }) => {
              if (error) {
                console.error('[amber-voice] Failed to store session:', error);
              } else {
                console.log('[amber-voice] Stored voice session:', sessionId);
              }
            });

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
