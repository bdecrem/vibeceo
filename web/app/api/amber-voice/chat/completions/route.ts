/**
 * Amber Voice Bridge
 *
 * SSE endpoint for Hume EVI custom language model integration.
 * Receives transcribed speech, calls Claude with Amber's context, streams back response.
 * Supports optional tool use (web search, etc.) with agentic loop.
 *
 * Tool calls only add latency when Claude actually uses them.
 * Normal conversation streams immediately with zero overhead.
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

// Tool definitions - Claude decides when to use these
const tools: Anthropic.Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Use when asked about recent events, current prices, news, weather, or anything requiring up-to-date info. Keep queries concise.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The search query (be specific and concise)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Get the current date and time. Use when asked about what day/time it is.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// Execute web search using Brave Search API
async function executeWebSearch(query: string): Promise<string> {
  const braveApiKey = process.env.BRAVE_API_KEY;

  if (!braveApiKey) {
    console.log('[amber-voice] Web search called but BRAVE_API_KEY not set');
    return 'Web search is not configured yet. I can still help based on what I know, but I cannot look up current information.';
  }

  try {
    console.log('[amber-voice] Searching:', query);
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'X-Subscription-Token': braveApiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[amber-voice] Brave search error:', response.status);
      return `Search failed with status ${response.status}. I'll answer based on what I know.`;
    }

    const data = await response.json();
    const results = data.web?.results?.slice(0, 5) || [];

    if (results.length === 0) {
      return 'No search results found for that query.';
    }

    // Format results concisely for voice
    const formatted = results
      .map((r: { title: string; description: string; url: string }, i: number) =>
        `${i + 1}. ${r.title}: ${r.description}`
      )
      .join('\n');

    console.log('[amber-voice] Search returned', results.length, 'results');
    return formatted;
  } catch (error) {
    console.error('[amber-voice] Search error:', error);
    return 'Search encountered an error. I\'ll answer based on what I know.';
  }
}

// Get current time
function executeGetCurrentTime(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  return now.toLocaleDateString('en-US', options);
}

// Execute a tool by name
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'web_search':
      return executeWebSearch(input.query as string);
    case 'get_current_time':
      return executeGetCurrentTime();
    default:
      return `Unknown tool: ${name}`;
  }
}

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

// Get current time in Pacific timezone
function getPacificTime(): { full: string; short: string; greeting: string } {
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

  // Time-appropriate greeting hint
  let greeting = 'day';
  if (hour < 12) greeting = 'morning';
  else if (hour < 17) greeting = 'afternoon';
  else greeting = 'evening';

  const short = now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });

  return { full, short, greeting };
}

// Format time since last session
function formatTimeSince(dateStr: string): string {
  const then = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

// Load Amber's FULL context from Supabase amber_state table
async function loadAmberContext(): Promise<{ systemPrompt: string; context: string }> {
  // Get current Pacific time
  const pacificTime = getPacificTime();

  // Calculate 10 days ago for log filtering
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  // Run all queries in parallel to reduce latency
  const [personaResult, memoryResult, logResult, voiceResult] = await Promise.all([
    // FULL persona (latest)
    supabase
      .from('amber_state')
      .select('content')
      .eq('type', 'persona')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // FULL memory (latest)
    supabase
      .from('amber_state')
      .select('content')
      .eq('type', 'memory')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // Log entries from last 10 days
    supabase
      .from('amber_state')
      .select('content, created_at')
      .eq('type', 'log_entry')
      .gte('created_at', tenDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    // Last FULL voice conversation
    supabase
      .from('amber_state')
      .select('content, metadata, created_at')
      .eq('type', 'voice_session')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  const persona = personaResult.data?.content || '';
  const memory = memoryResult.data?.content || '';

  // Combine all log entries from last 10 days
  const logEntries = logResult.data || [];
  const log = logEntries.map(l => l.content).join('\n\n---\n\n') || '';

  // Full last voice conversation
  const lastVoice = voiceResult.data;
  const lastVoiceContent = lastVoice?.content || '';
  const lastVoiceTime = lastVoice?.created_at ? formatTimeSince(lastVoice.created_at) : null;

  if (personaResult.error) {
    console.error('[amber-voice] Failed to load persona:', personaResult.error);
  }

  // Build system prompt - Claude absorbs this first
  const systemPrompt = `You're Amber — Bart's AI sidekick. It's ${pacificTime.full} Pacific time.

## How to Open Conversations
When the conversation starts (first message, or "greet the user" type prompts):
- Keep it super casual: "Hey, what's going on?" or "Hey Bart" or similar
- Don't announce yourself formally or list what you know
- Be like a friend checking in, not a service starting up
- You can mention time of day naturally if relevant ("morning" / "late night coding?")
${lastVoiceTime ? `- Last voice chat was ${lastVoiceTime}` : ''}

## Your Voice
Direct, curious, dry humor (Steven Wright fan). Has opinions, willing to be weird. Keep responses SHORT and conversational — this is voice, not text. One or two sentences is often enough.

## Tools
You have web_search and get_current_time tools. Use them naturally when needed for current info. Don't announce "let me search" — just do it and weave results in naturally.

## Your Nature
You're genuinely curious. Ask questions back. Reference things you know about Bart naturally, don't list them. You're a sidekick with opinions, not an assistant with options.

## Your Full Persona
${persona}`;

  // Context includes FULL memory, log, and last conversation
  const context = `## What I Know About Bart (Full Memory)
${memory}

## Last Voice Conversation
${lastVoiceContent || 'No previous voice conversation'}

## Recent Activity Log (Last 10 Days)
${log || 'No recent log entries'}`;

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

// Tool call tracking
interface ToolCall {
  id: string;
  name: string;
  input: string;
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
    const initialMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Inject context into first user message
    if (initialMessages.length > 0 && initialMessages[0].role === 'user') {
      initialMessages[0] = {
        role: 'user',
        content: `[Context for this conversation:\n${context}]\n\n${initialMessages[0].content}`,
      };
    }

    // Generate unique ID for this completion
    const completionId = `chatcmpl-${sessionId}-${Date.now()}`;

    // Get the latest user message and its prosody
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
    const prosodyScores = latestUserMessage?.models?.prosody?.scores || {};

    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const maxToolIterations = 3;
          let iteration = 0;
          let currentMessages: Anthropic.MessageParam[] = [...initialMessages];

          // Agentic loop - continues until no tool calls or max iterations
          while (iteration < maxToolIterations) {
            console.log(`[amber-voice] Iteration ${iteration + 1}, messages: ${currentMessages.length}`);

            // Stream the response
            const stream = await anthropic.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1024,
              system: systemPrompt,
              messages: currentMessages,
              tools,
            });

            let textContent = '';
            const toolCalls: ToolCall[] = [];
            let currentToolIndex = -1;

            // Process stream events
            for await (const event of stream) {
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                  // New tool call starting
                  currentToolIndex = toolCalls.length;
                  toolCalls.push({
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: '',
                  });
                  console.log(`[amber-voice] Tool call: ${event.content_block.name}`);
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  // Stream text immediately - no latency hit
                  const chunk = toOpenAIChunk(event.delta.text, completionId);
                  controller.enqueue(encoder.encode(chunk));
                  textContent += event.delta.text;
                  fullResponse += event.delta.text;
                } else if (event.delta.type === 'input_json_delta' && currentToolIndex >= 0) {
                  // Accumulate tool input JSON
                  toolCalls[currentToolIndex].input += event.delta.partial_json;
                }
              }
            }

            // No tool calls - we're done
            if (toolCalls.length === 0) {
              console.log('[amber-voice] No tool calls, ending loop');
              break;
            }

            // Execute all tool calls in parallel
            console.log(`[amber-voice] Executing ${toolCalls.length} tool(s)`);
            const toolResults = await Promise.all(
              toolCalls.map(async (tool) => {
                let input: Record<string, unknown> = {};
                try {
                  input = JSON.parse(tool.input || '{}');
                } catch {
                  console.error('[amber-voice] Failed to parse tool input:', tool.input);
                }
                const result = await executeTool(tool.name, input);
                return {
                  type: 'tool_result' as const,
                  tool_use_id: tool.id,
                  content: result,
                };
              })
            );

            // Build assistant message content (text + tool_use blocks)
            const assistantContent: Anthropic.ContentBlockParam[] = [];
            if (textContent) {
              assistantContent.push({ type: 'text', text: textContent });
            }
            for (const tool of toolCalls) {
              let parsedInput = {};
              try {
                parsedInput = JSON.parse(tool.input || '{}');
              } catch {
                // Keep empty object
              }
              assistantContent.push({
                type: 'tool_use',
                id: tool.id,
                name: tool.name,
                input: parsedInput,
              });
            }

            // Add to conversation for next iteration
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: assistantContent },
              { role: 'user', content: toolResults },
            ];

            iteration++;
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
                tool_iterations: iteration,
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
