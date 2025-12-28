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

// Load Amber's context from Supabase amber_state table
async function loadAmberContext(): Promise<{ systemPrompt: string; context: string }> {
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

You have tools available (web search, time). Use them naturally when needed, but don't announce "let me search" — just do it and incorporate the results conversationally.

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
