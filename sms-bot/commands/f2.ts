/**
 * F2 — text a URL, F2 stores it + fetches its contents, then chat about it.
 *
 *   f2 https://example.com/article   → starts a new thread for that URL
 *   f2 what's the main argument?     → chats about the most recent thread
 *   f2                               → brief help
 *
 * State lives in `f2_threads` (one row per URL the user sent in).
 * Messages are stored inline as a JSONB array on the thread row.
 */

import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase.js";
import { matchesPrefix } from "./command-utils.js";
import type { CommandContext, CommandHandler } from "./types.js";

const F2_PREFIX = "F2";
const MODEL = "claude-sonnet-4-20250514";
const MAX_STORED_CONTENT = 30000;        // chars persisted on the thread row
const MAX_CONTEXT_FOR_CHAT = 24000;       // chars sent to Claude as context
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = "Mozilla/5.0 (compatible; KochiBot/1.0; +https://kochi.to)";

type F2Message = {
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

type F2Thread = {
  id: string;
  phone: string;
  url: string;
  content: string | null;
  messages: F2Message[];
  created_at: string;
  updated_at: string;
};

function isUrl(s: string): boolean {
  return /^https?:\/\/\S+/i.test(s.trim());
}

function stripHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  return text.replace(/\s+/g, " ").trim();
}

async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`[f2] fetch ${url} → ${res.status}`);
      return null;
    }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) {
      console.log(`[f2] skipping non-text content-type for ${url}: ${ct}`);
      return null;
    }

    const body = await res.text();
    const text = ct.includes("text/html") ? stripHtml(body) : body.trim();
    if (text.length < 50) return null;

    return text.slice(0, MAX_STORED_CONTENT);
  } catch (err) {
    console.error(`[f2] fetch error for ${url}:`, err);
    return null;
  }
}

async function createThread(
  phone: string,
  url: string,
  content: string | null
): Promise<F2Thread | null> {
  const { data, error } = await supabase
    .from("f2_threads")
    .insert({ phone, url, content, messages: [] })
    .select("*")
    .single();

  if (error) {
    console.error("[f2] createThread failed:", error);
    return null;
  }
  return data as F2Thread;
}

async function getLatestThread(phone: string): Promise<F2Thread | null> {
  const { data, error } = await supabase
    .from("f2_threads")
    .select("*")
    .eq("phone", phone)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[f2] getLatestThread failed:", error);
    return null;
  }
  return data as F2Thread | null;
}

async function appendMessages(
  threadId: string,
  existing: F2Message[],
  toAdd: F2Message[]
): Promise<void> {
  const messages = [...existing, ...toAdd];
  const { error } = await supabase
    .from("f2_threads")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) console.error("[f2] appendMessages failed:", error);
}

async function chatWithThread(
  thread: F2Thread,
  userText: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = thread.content
    ? thread.content.slice(0, MAX_CONTEXT_FOR_CHAT)
    : null;

  const system = content
    ? `You're helping the user learn about a specific source they shared. Answer their questions using the content below as the primary source. If the answer isn't in the content, say so plainly.

URL: ${thread.url}

Content:
${content}

Reply rules:
- This is SMS — keep replies under 1200 characters, ideally much shorter.
- Be direct. No preambles like "Great question" or "Based on the article".
- Plain text, no markdown.`
    : `You're helping the user learn about a source they shared, but the fetched content was empty or unavailable. Answer from your general knowledge about the URL and flag uncertainty.

URL: ${thread.url}

Reply rules:
- This is SMS — keep replies under 1200 characters, ideally much shorter.
- Be direct, plain text, no markdown.`;

  const history = thread.messages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    system,
    messages: [...history, { role: "user", content: userText }],
  });

  const block = response.content[0];
  if (block?.type === "text") return block.text.trim();
  return "(no response)";
}

async function handleNewUrl(
  context: CommandContext,
  url: string
): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const content = await fetchUrlContent(url);
  const thread = await createThread(normalizedFrom, url, content);

  if (!thread) {
    await sendSmsResponse(
      from,
      "F2: couldn't save that URL. Try again in a sec.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  const reply = content
    ? `F2 got it. Stored ${url} (${content.length.toLocaleString()} chars of content). Reply "f2 <question>" to chat about it.`
    : `F2 stored ${url}, but couldn't pull readable text from it. You can still ask "f2 <question>" — I'll answer from general knowledge of the URL.`;

  await sendSmsResponse(from, reply, twilioClient);
  await updateLastMessageDate(normalizedFrom);
  return true;
}

async function handleChat(
  context: CommandContext,
  userText: string
): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendChunkedSmsResponse, updateLastMessageDate } = context;

  const thread = await getLatestThread(normalizedFrom);

  if (!thread) {
    await context.sendSmsResponse(
      from,
      'F2: no thread yet. Send "f2 https://..." with a URL first, then ask away.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  let reply: string;
  try {
    reply = await chatWithThread(thread, userText);
  } catch (err) {
    console.error("[f2] chat failed:", err);
    await context.sendSmsResponse(
      from,
      "F2: hit an error talking to Claude. Try again in a moment.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  const now = new Date().toISOString();
  await appendMessages(thread.id, thread.messages, [
    { role: "user", text: userText, created_at: now },
    { role: "assistant", text: reply, created_at: now },
  ]);

  await sendChunkedSmsResponse(from, reply, twilioClient);
  await updateLastMessageDate(normalizedFrom);
  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;
  await sendSmsResponse(
    from,
    'F2 — learn from a URL.\n• f2 https://...  start a thread for that URL\n• f2 <question>  ask about your latest thread',
    twilioClient
  );
  await updateLastMessageDate(normalizedFrom);
  return true;
}

export const f2CommandHandler: CommandHandler = {
  name: "f2",
  matches(context) {
    return matchesPrefix(context.messageUpper, F2_PREFIX);
  },
  async handle(context) {
    // Use the original-case message; URLs are case-sensitive.
    const trimmed = context.message.trim();
    // Strip leading "f2" (case-insensitive) plus optional punctuation/space.
    const rest = trimmed.replace(/^f2[\s,!?:;.]*/i, "").trim();

    if (!rest) return handleHelp(context);

    const firstToken = rest.split(/\s+/)[0];
    if (isUrl(firstToken)) {
      return handleNewUrl(context, firstToken);
    }
    return handleChat(context, rest);
  },
};
