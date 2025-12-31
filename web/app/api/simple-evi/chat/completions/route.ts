/**
 * Simple EVI CLM Endpoint
 *
 * Minimal Custom Language Model for debugging Hume EVI connection issues.
 * No tools, no context loading, no Supabase - just Claude streaming.
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface EVIMessage {
  role: 'user' | 'assistant';
  content: string;
}

function toSSEChunk(text: string): string {
  return `data: ${JSON.stringify({
    id: 'chatcmpl-simple',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'simple-clm',
    system_fingerprint: 'simple',
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

function toSSEFinalChunk(): string {
  return `data: ${JSON.stringify({
    id: 'chatcmpl-simple',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'simple-clm',
    system_fingerprint: 'simple',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })}\n\n`;
}

export async function POST(request: NextRequest) {
  console.log('[simple-evi] Received request');

  try {
    const body = await request.json();
    const messages: EVIMessage[] = body.messages || [];

    // Get last user message
    const lastMessage = messages.filter((m) => m.role === 'user').pop();
    const userText = lastMessage?.content || 'Hello';

    console.log('[simple-evi] User said:', userText.slice(0, 100));

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let closed = false;

        const safeEnqueue = (data: Uint8Array) => {
          if (!closed) {
            try {
              controller.enqueue(data);
            } catch {
              closed = true;
            }
          }
        };

        try {
          // Immediate heartbeat
          safeEnqueue(encoder.encode(': keep-alive\n\n'));
          console.log('[simple-evi] Sent heartbeat');

          const stream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 256,
            system: 'You are a friendly voice assistant. Keep responses SHORT (1-2 sentences). Be conversational.',
            messages: [{ role: 'user', content: userText }],
          });

          console.log('[simple-evi] Claude stream started');

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              safeEnqueue(encoder.encode(toSSEChunk(event.delta.text)));
            }
          }

          console.log('[simple-evi] Claude stream complete');

          // Send final chunk with finish_reason
          safeEnqueue(encoder.encode(toSSEFinalChunk()));
          safeEnqueue(encoder.encode('data: [DONE]\n\n'));

          if (!closed) {
            controller.close();
          }
        } catch (error) {
          console.error('[simple-evi] Error:', error);
          if (!closed) {
            controller.error(error);
          }
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
    console.error('[simple-evi] Request error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
