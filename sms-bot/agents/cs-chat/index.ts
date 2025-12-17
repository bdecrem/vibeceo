/**
 * CS Chat Agent - Pure TypeScript Implementation
 *
 * Agentic search using Anthropic SDK with tool_use.
 * No Python, no supabase-py - just TypeScript that works.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface CSChatResult {
  answer: string;
  toolCalls?: number;
}

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: "get_all_links",
    description:
      "Get all shared links with their summaries. Use this for broad questions about themes, patterns, or to see everything that has been shared.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_links",
    description:
      "Search links by keyword in content, summary, or notes. Use this for specific questions about particular topics.",
    input_schema: {
      type: "object" as const,
      properties: {
        keyword: {
          type: "string",
          description: "The keyword to search for",
        },
      },
      required: ["keyword"],
    },
  },
];

// Tool implementations
async function getAllLinks(): Promise<string> {
  const { data, error } = await supabase
    .from("cs_content")
    .select("id, url, domain, posted_by_name, notes, posted_at, content_summary")
    .not("content_fetched_at", "is", null)
    .order("posted_at", { ascending: false })
    .limit(50);

  if (error) {
    return JSON.stringify({ error: error.message });
  }
  return JSON.stringify(data, null, 2);
}

async function searchLinks(keyword: string): Promise<string> {
  const { data, error } = await supabase
    .from("cs_content")
    .select(
      "id, url, domain, posted_by_name, notes, posted_at, content_summary, content_text"
    )
    .not("content_fetched_at", "is", null)
    .or(
      `content_text.ilike.%${keyword}%,content_summary.ilike.%${keyword}%,notes.ilike.%${keyword}%`
    )
    .order("posted_at", { ascending: false })
    .limit(20);

  if (error) {
    return JSON.stringify({ error: error.message });
  }
  return JSON.stringify(data, null, 2);
}

// Process tool calls
async function processToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_all_links":
      return getAllLinks();
    case "search_links":
      return searchLinks(input.keyword as string);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/**
 * Run CS chat using Anthropic SDK with tool_use
 */
export async function runCSChat(question: string): Promise<CSChatResult> {
  console.log("[CS Chat] Starting query:", question);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("[CS Chat] API key check:", apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)} (len=${apiKey.length})` : "MISSING");

  const anthropic = new Anthropic({
    apiKey,
  });
  let toolCalls = 0;

  const systemPrompt = `You are a helpful assistant answering questions about a collection of shared links stored in a database.

DATABASE SCHEMA:
The cs_content table contains shared links with:
- url: The shared URL
- domain: Extracted domain (e.g., 'github.com')
- posted_by_name: Who shared it
- notes: Optional comment from the sharer
- posted_at: When it was shared
- content_summary: AI-generated 2-sentence summary

STRATEGY:
- For broad questions ("any themes?", "summarize everything") → use get_all_links
- For specific questions ("articles about AI") → use search_links with keywords

Instructions:
1. Use the tools to find relevant information
2. You can make multiple queries if needed
3. Answer concisely (2-4 sentences)
4. Cite sources by their domain or URL
5. If nothing relevant is found, say so honestly`;

  // Initial request
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: question },
  ];

  // Agentic loop - let Claude use tools until it has an answer
  const MAX_ITERATIONS = 5;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // Check if we got a final text response
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        console.log(`[CS Chat] Response generated (${toolCalls} tool calls)`);
        return { answer: textBlock.text, toolCalls };
      }
    }

    // Process tool uses
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b) => b.type === "tool_use"
      );

      // Add assistant's response to messages
      messages.push({ role: "assistant", content: response.content });

      // Process each tool call and add results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type === "tool_use") {
          toolCalls++;
          console.log(`[CS Chat] Tool call: ${block.name}`);
          const result = await processToolCall(
            block.name,
            block.input as Record<string, unknown>
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // If we get here with text content, return it
    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      console.log(`[CS Chat] Response generated (${toolCalls} tool calls)`);
      return { answer: textBlock.text, toolCalls };
    }
  }

  return {
    answer: "Sorry, I couldn't generate a response after multiple attempts.",
    toolCalls,
  };
}
