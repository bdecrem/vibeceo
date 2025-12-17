/**
 * Backfill CS content - fetches and summarizes existing links
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const MAX_CONTENT_LENGTH = 5000;
const MAX_CONTEXT_FOR_SUMMARY = 8000;

function extractText(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

  text = text.replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  text = text.replace(/\s+/g, " ").trim();

  return text;
}

async function generateSummary(url: string, text: string): Promise<string | null> {
  try {
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Summarize this article in exactly 2 sentences. Be specific about what it covers. Do not start with "This article" - just state the facts.

URL: ${url}

Content:
${text}

Summary (2 sentences):`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text.trim();
    }
    return null;
  } catch (error) {
    console.error("[backfill] Summary generation failed:", error);
    return null;
  }
}

async function fetchAndSummarizeLink(linkId: string, url: string): Promise<void> {
  console.log(`[backfill] Processing: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KochiBot/1.0; +https://kochi.to)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[backfill] Failed to fetch ${url}: ${response.status}`);
      await markFetched(linkId, null, null);
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      console.log(`[backfill] Skipping non-text: ${contentType}`);
      await markFetched(linkId, null, null);
      return;
    }

    const html = await response.text();
    const text = extractText(html);

    if (!text || text.length < 50) {
      console.log(`[backfill] Not enough text from ${url}`);
      await markFetched(linkId, text || null, null);
      return;
    }

    const contentText = text.slice(0, MAX_CONTENT_LENGTH);
    const summary = await generateSummary(url, text.slice(0, MAX_CONTEXT_FOR_SUMMARY));

    await markFetched(linkId, contentText, summary);
    console.log(`[backfill] ✓ ${url}`);
    if (summary) {
      console.log(`  Summary: ${summary.slice(0, 100)}...`);
    }
  } catch (error) {
    console.error(`[backfill] Error processing ${url}:`, error);
    await markFetched(linkId, null, null);
  }
}

async function markFetched(
  linkId: string,
  contentText: string | null,
  contentSummary: string | null
): Promise<void> {
  const { error } = await supabase
    .from("cs_content")
    .update({
      content_text: contentText,
      content_summary: contentSummary,
      content_fetched_at: new Date().toISOString(),
    })
    .eq("id", linkId);

  if (error) {
    console.error("[backfill] DB update failed:", error);
  }
}

async function main() {
  console.log("Starting CS content backfill...\n");

  const { data: links, error } = await supabase
    .from("cs_content")
    .select("id, url")
    .is("content_fetched_at", null)
    .order("posted_at", { ascending: false })
    .limit(50);

  if (error || !links) {
    console.error("Failed to get links:", error);
    process.exit(1);
  }

  console.log(`Found ${links.length} links to process\n`);

  for (const link of links) {
    await fetchAndSummarizeLink(link.id, link.url);
    // Rate limit
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("\nBackfill complete!");
}

main().catch(console.error);
