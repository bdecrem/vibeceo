/**
 * CS Content Fetcher - Fetches and summarizes link content for CS (Content Sharing)
 *
 * Called asynchronously after a link is posted to:
 * 1. Fetch the page content
 * 2. Extract and clean the text
 * 3. Generate a 2-sentence summary via Claude
 * 4. Store in cs_content table
 */

import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase.js";

const MAX_CONTENT_LENGTH = 5000; // chars to store
const MAX_CONTEXT_FOR_SUMMARY = 8000; // chars to send to Claude

/**
 * Extract a readable title from URL slug as fallback when fetch fails
 * Returns null if slug doesn't look descriptive enough
 */
function extractTitleFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Get the last meaningful path segment (skip index.html etc)
    let slug = pathParts[pathParts.length - 1];
    if (!slug || slug.includes('.')) {
      slug = pathParts[pathParts.length - 2];
    }
    if (!slug) return null;

    // Check if it's descriptive (has 3+ hyphenated/underscored words)
    const words = slug.split(/[-_]+/).filter(w => w.length > 1);
    if (words.length < 3) return null;

    // Convert to readable title
    const title = words
      .map(word => {
        // Handle common lowercase words
        const lower = word.toLowerCase();
        if (['a', 'an', 'the', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'of'].includes(lower)) {
          return lower;
        }
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    // Capitalize first word always
    return title.charAt(0).toUpperCase() + title.slice(1);
  } catch {
    return null;
  }
}

/**
 * Fetch page content and generate summary for a CS link
 * Called asynchronously - does not block SMS response
 */
export async function fetchAndSummarizeLink(linkId: string, url: string): Promise<void> {
  console.log(`[cs-content] Fetching content for ${url}`);

  try {
    // 1. Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KochiBot/1.0; +https://kochi.to)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      console.error(`[cs-content] Failed to fetch ${url}: ${response.status}`);
      // Try URL-based fallback
      const urlTitle = extractTitleFromUrl(url);
      if (urlTitle) {
        console.log(`[cs-content] Using URL-based title: ${urlTitle}`);
        await markFetched(linkId, null, urlTitle);
      } else {
        await markFetched(linkId, null, null);
      }
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      console.log(`[cs-content] Skipping non-text content: ${contentType}`);
      const urlTitle = extractTitleFromUrl(url);
      await markFetched(linkId, null, urlTitle);
      return;
    }

    const html = await response.text();

    // 2. Extract text from HTML
    const text = extractText(html);
    if (!text || text.length < 50) {
      console.log(`[cs-content] Not enough text content from ${url}`);
      const urlTitle = extractTitleFromUrl(url);
      await markFetched(linkId, text || null, urlTitle);
      return;
    }

    const contentText = text.slice(0, MAX_CONTENT_LENGTH);

    // 3. Generate summary
    const summary = await generateSummary(url, text.slice(0, MAX_CONTEXT_FOR_SUMMARY));

    // 4. Store in database
    await markFetched(linkId, contentText, summary);
    console.log(`[cs-content] Successfully processed ${url}`);
  } catch (error) {
    console.error(`[cs-content] Error processing ${url}:`, error);
    const urlTitle = extractTitleFromUrl(url);
    await markFetched(linkId, null, urlTitle);
  }
}

/**
 * Extract readable text from HTML
 */
function extractText(html: string): string {
  // Remove script, style, nav, header, footer tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  // Clean up whitespace
  text = text
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/**
 * Generate a 2-sentence summary using Claude
 */
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
    console.error("[cs-content] Summary generation failed:", error);
    return null;
  }
}

/**
 * Update the database with fetched content
 */
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
    console.error("[cs-content] Failed to update database:", error);
  }
}

/**
 * Backfill content for links that haven't been fetched yet
 * Can be called periodically or manually
 */
export async function backfillUnfetchedLinks(limit = 10): Promise<number> {
  const { data: links, error } = await supabase
    .from("cs_content")
    .select("id, url")
    .is("content_fetched_at", null)
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error || !links) {
    console.error("[cs-content] Failed to get unfetched links:", error);
    return 0;
  }

  console.log(`[cs-content] Backfilling ${links.length} links`);

  for (const link of links) {
    await fetchAndSummarizeLink(link.id, link.url);
    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  return links.length;
}
