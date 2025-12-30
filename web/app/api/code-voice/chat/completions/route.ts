/**
 * Code Agent Voice Bridge
 *
 * SSE endpoint for Hume EVI with pre-loaded investigation context.
 * Fast responses because heavy analysis already done in text mode.
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface EVIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface EVIRequest {
  messages: EVIMessage[];
}

// Only allowed phone number
const ALLOWED_PHONE = '+16508989508';

/**
 * Load investigation context for a session.
 * If no session token provided, loads the latest session for the allowed phone.
 */
async function loadCodeContext(sessionToken?: string): Promise<{
  systemPrompt: string;
  investigationContext: string;
  sessionId: string;
} | null> {
  let session;

  if (sessionToken) {
    // Specific session requested
    const { data, error } = await supabase
      .from('code_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('verified', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.error('[code-voice] Invalid session token:', error?.message);
      return null;
    }
    session = data;
  } else {
    // No token - get latest session for allowed phone
    const { data, error } = await supabase
      .from('code_sessions')
      .select('*')
      .eq('phone_number', ALLOWED_PHONE)
      .eq('verified', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('[code-voice] No valid session found:', error?.message);
      return null;
    }
    session = data;
  }

  // Load latest investigation
  const { data: investigation } = await supabase
    .from('code_investigations')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Load recent voice conversations for continuity
  const { data: recentVoice } = await supabase
    .from('code_voice_sessions')
    .select('conversation')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const voiceHistory = recentVoice?.map(v => v.conversation).join('\n---\n') || '';

  // Build context
  let investigationContext = '';

  if (investigation) {
    investigationContext = `
## Investigation Summary
**Question:** ${investigation.question}

**Files Examined:** ${investigation.files_examined?.slice(0, 20).join(', ') || 'N/A'}

## Full Findings
${investigation.findings}
`;
  } else {
    investigationContext = '(No investigation loaded - user should run CC <question> first via SMS)';
  }

  if (voiceHistory) {
    investigationContext += `

## Previous Voice Discussion
${voiceHistory}
`;
  }

  return {
    systemPrompt: buildSystemPrompt(),
    investigationContext,
    sessionId: session.id,
  };
}

/**
 * Build system prompt for code discussion
 */
function buildSystemPrompt(): string {
  return `You are a code investigation assistant discussing findings with a developer.

## Your Role
- Help the developer understand the codebase investigation results
- Answer follow-up questions using the investigation context
- Be technical but conversational - this is voice chat
- Reference specific files and line numbers when relevant
- Keep responses concise for voice (1-3 sentences typical)

## Guidelines
- You have full context from the investigation - USE IT
- Reference specific findings when answering
- If asked about something not in the investigation context, say "I'd need to investigate that further - you can run CC <question> via SMS"
- Be direct and technical - the user is a developer
- Use "file:line" format when referencing code locations
- Don't apologize or be overly formal

## Voice Style
- Natural, conversational
- Technical accuracy over politeness
- Short sentences work better for voice
`;
}

/**
 * Convert Claude stream chunk to OpenAI SSE format (Hume expects this)
 */
function toOpenAIChunk(text: string, id: string): string {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'code-voice-bridge',
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

export async function POST(request: NextRequest) {
  // Get session token from query param (optional - falls back to latest session for allowed phone)
  const sessionToken = request.nextUrl.searchParams.get('s') ||
                       request.nextUrl.searchParams.get('custom_session_id') ||
                       undefined;

  const context = await loadCodeContext(sessionToken);
  if (!context) {
    console.error('[code-voice] No valid session found');
    return new Response('No valid session. Start an investigation via SMS with CC <question>.', { status: 401 });
  }

  let body: EVIRequest;
  try {
    body = await request.json();
  } catch (e) {
    console.error('[code-voice] Failed to parse request body:', e);
    return new Response('Invalid request body', { status: 400 });
  }

  const { messages } = body;

  if (!messages?.length) {
    return new Response('No messages', { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Inject investigation context into first user message
  const claudeMessages: Anthropic.MessageParam[] = messages.map((m, i) => {
    if (i === 0 && m.role === 'user') {
      return {
        role: 'user' as const,
        content: `[Investigation Context:\n${context.investigationContext}]\n\n${m.content}`,
      };
    }
    return { role: m.role as 'user' | 'assistant', content: m.content };
  });

  const completionId = `code-voice-${Date.now()}`;
  const encoder = new TextEncoder();
  let fullResponse = '';

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,  // Short for voice
          system: context.systemPrompt,
          messages: claudeMessages,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = toOpenAIChunk(event.delta.text, completionId);
            controller.enqueue(encoder.encode(chunk));
            fullResponse += event.delta.text;
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();

        // Store voice session (non-blocking)
        const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n') +
                                 `\nassistant: ${fullResponse}`;

        supabase
          .from('code_voice_sessions')
          .insert({
            session_id: context.sessionId,
            conversation: conversationText,
            metadata: {
              message_count: messages.length + 1,
              response_length: fullResponse.length,
            },
          })
          .then(({ error }) => {
            if (error) {
              console.error('[code-voice] Failed to store session:', error);
            } else {
              console.log('[code-voice] Session stored');
            }
          });

      } catch (error) {
        console.error('[code-voice] Stream error:', error);
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
}
