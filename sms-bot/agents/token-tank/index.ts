/**
 * Token Tank Daily - SMS + Twitter Distribution
 *
 * Fetches the latest blog post from GitHub raw (BLOG.md), extracts the tweetable
 * summary, posts to Twitter, and sends to SMS subscribers.
 *
 * The blog post is written by Arc locally and pushed to GitHub.
 * This module fetches from GitHub raw (same source the website uses) and handles distribution.
 */

import {
  createShortLink,
  normalizeShortLinkDomain,
} from "../../lib/utils/shortlink-service.js";
import { getAgentSubscribers, markAgentReportSent } from "../../lib/agent-subscriptions.js";
import type { TwilioClient } from "../../lib/sms/webhooks.js";
import { registerDailyJob } from "../../lib/scheduler/index.js";
import { sendSmsResponse } from "../../lib/sms/handlers.js";
import { postTweet, isTwitterConfigured } from "../../lib/twitter-client.js";

export const TOKEN_TANK_AGENT_SLUG = "token-tank";

// Default time: 8:00 AM PT
const DEFAULT_BROADCAST_HOUR = parseInt(process.env.TOKEN_TANK_BROADCAST_HOUR || "8", 10);
const DEFAULT_BROADCAST_MINUTE = parseInt(process.env.TOKEN_TANK_BROADCAST_MINUTE || "0", 10);

// GitHub raw URL for BLOG.md (same source the website uses)
const BLOG_MD_URL = "https://raw.githubusercontent.com/bdecrem/vibeceo/main/incubator/BLOG.md";
const BLOG_BASE_URL = "https://tokentank.io/token-tank/#blog";
const MAX_SMS_LENGTH = 670; // Keep SMS in a single Twilio send (avoid link previews/split delivery)

interface LatestBlogPost {
  date: string;
  title: string;
  tweetSummary: string;
}

/**
 * Fetch and parse the latest blog post from GitHub raw
 *
 * Fetches BLOG.md directly from GitHub (same source the website uses)
 * and parses the markdown to extract:
 * - Date (e.g., "December 10, 2025")
 * - Title (e.g., "Six Agents, Three Traders, Zero Dollars")
 * - Tweet summary (the blockquote text starting with >)
 */
export async function getLatestBlogPost(): Promise<LatestBlogPost | null> {
  try {
    console.log(`[token-tank] Fetching BLOG.md from GitHub...`);

    const response = await fetch(BLOG_MD_URL);
    if (!response.ok) {
      console.error(`[token-tank] Failed to fetch BLOG.md: ${response.status}`);
      return null;
    }

    const content = await response.text();

    // Split by "---" to get individual posts
    const sections = content.split(/\n---\n/);

    // Find the first section that looks like a dated post (after the header)
    for (const section of sections) {
      // Match "## December 10, 2025: Title" or "## YYYY-MM-DD: Title"
      const headerMatch = section.match(/##\s+(.+?):\s*(.+)/);
      if (!headerMatch) continue;

      const dateStr = headerMatch[1].trim();
      const title = headerMatch[2].trim();

      // Extract the tweetable summary (blockquote starting with >)
      const summaryMatch = section.match(/>\s*(.+?)(?:\n\n|\n(?!>))/s);
      if (!summaryMatch) continue;

      const tweetSummary = summaryMatch[1].trim();

      if (tweetSummary.length > 280) {
        console.warn(`[token-tank] Tweet summary too long (${tweetSummary.length} chars), truncating`);
      }

      return {
        date: dateStr,
        title,
        tweetSummary: tweetSummary.substring(0, 280),
      };
    }

    console.error("[token-tank] No valid blog post found in BLOG.md");
    return null;
  } catch (error) {
    console.error("[token-tank] Failed to fetch blog post:", error);
    return null;
  }
}

/**
 * Build the SMS message: headline + summary + inline link
 *
 * Format keeps the link in the same SMS (Twilio won't inline with extra newlines):
 * 🏦 Token Tank — Summary sentence here.
 * Read: https://kochi.to/l/xxxx
 */
function formatTokenTankSummary(rawSummary: string): string {
  const cleaned = rawSummary.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "Token Tank update is live.";
  }

  const sentenceMatch = cleaned.match(/[^.!?]+[.!?]/);
  const sentence = sentenceMatch ? sentenceMatch[0].trim() : cleaned;

  if (sentence.length <= 220) {
    return sentence;
  }

  return `${sentence.slice(0, 217).trimEnd()}...`;
}

// Cached shortlink for the current broadcast (one per broadcast, not per-recipient)
let cachedBroadcastLink: string | null = null;

async function getOrCreateBroadcastLink(): Promise<string> {
  if (cachedBroadcastLink) {
    return cachedBroadcastLink;
  }

  try {
    const shortLink = await createShortLink(BLOG_BASE_URL, {
      context: "token-tank-blog",
      createdBy: "token-tank-agent",
    });

    if (shortLink) {
      cachedBroadcastLink = normalizeShortLinkDomain(shortLink);
      return cachedBroadcastLink;
    }
  } catch (error) {
    console.warn("[token-tank] Failed to create short link:", error);
  }

  return BLOG_BASE_URL;
}

function clearBroadcastLinkCache(): void {
  cachedBroadcastLink = null;
}

function composeSms(headline: string, summary: string, linkLine: string): string {
  const message = `${headline}${summary}\n${linkLine}`;

  if (message.length <= MAX_SMS_LENGTH) {
    return message;
  }

  const availableForSummary =
    MAX_SMS_LENGTH - headline.length - linkLine.length - 1; // account for newline

  if (availableForSummary <= 0) {
    return `${headline.trimEnd()}\n${linkLine}`;
  }

  const trimmedSummary =
    summary.length > availableForSummary
      ? `${summary.slice(0, Math.max(availableForSummary - 3, 0)).trimEnd()}...`
      : summary;

  return `${headline}${trimmedSummary}\n${linkLine}`;
}

export async function buildTokenTankSmsMessage(
  tweetSummary: string
): Promise<string> {
  const summaryLine = formatTokenTankSummary(tweetSummary);
  const link = await getOrCreateBroadcastLink();
  const headline = "🏦 Token Tank — ";
  // Inline link format (like arXiv) avoids rich preview card
  const linkLine = `Read more: ${link} — summary on site`;

  return composeSms(headline, summaryLine, linkLine);
}

/**
 * Get the latest blog post info for the TT command
 */
export async function getLatestTokenTankUpdate(): Promise<{
  tweetSummary: string;
  date: string;
  title: string;
} | null> {
  const post = await getLatestBlogPost();
  if (!post) return null;

  return {
    tweetSummary: post.tweetSummary,
    date: post.date,
    title: post.title,
  };
}

/**
 * Broadcast the latest blog post to all subscribers
 */
export async function broadcastTokenTankUpdate(
  twilioClient: TwilioClient,
  sendSms: (to: string, message: string, client: TwilioClient) => Promise<any>
): Promise<{ sent: number; failed: number }> {
  // Clear cached link to ensure fresh shortlink for this broadcast
  clearBroadcastLinkCache();

  const subscribers = await getAgentSubscribers(TOKEN_TANK_AGENT_SLUG);

  if (subscribers.length === 0) {
    console.log("[token-tank] No subscribers to broadcast to");
    return { sent: 0, failed: 0 };
  }

  const post = await getLatestBlogPost();
  if (!post) {
    console.log("[token-tank] No blog post to broadcast");
    return { sent: 0, failed: 0 };
  }

  // Build message once for all subscribers (same shortlink for everyone)
  const message = await buildTokenTankSmsMessage(post.tweetSummary);

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      await sendSms(subscriber.phone_number, message, twilioClient);
      await markAgentReportSent(subscriber.phone_number, TOKEN_TANK_AGENT_SLUG);
      sent++;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 150));
    } catch (error) {
      console.error(
        `[token-tank] Failed to send to ${subscriber.phone_number}:`,
        error
      );
      failed++;
    }
  }

  console.log(`[token-tank] Broadcast complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Register the daily Token Tank broadcast job
 *
 * At 8am PT, fetches the latest blog post from GitHub raw and broadcasts
 * it via Twitter and SMS. Arc writes and pushes the blog post; this job
 * reads from GitHub so it always has fresh content.
 */
export function registerTokenTankDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: "token-tank-daily",
    hour: DEFAULT_BROADCAST_HOUR,
    minute: DEFAULT_BROADCAST_MINUTE,
    timezone: "America/Los_Angeles",
    async run() {
      console.log("[token-tank] Starting daily broadcast...");

      try {
        const post = await getLatestBlogPost();

        if (!post) {
          console.log("[token-tank] No blog post found, skipping broadcast");
          return;
        }

        console.log(`[token-tank] Broadcasting latest post: "${post.title}" (${post.date})`);

        // Create shortlink for the blog post
        const shortLink = await createShortLink(BLOG_BASE_URL, {
          context: "token-tank-tweet",
          createdFor: "twitter",
          createdBy: "token-tank-agent",
        });
        const link = shortLink || BLOG_BASE_URL;

        // Post to Twitter
        if (isTwitterConfigured()) {
          const tweetText = `${post.tweetSummary}\n\n${link}`;
          const tweetResult = await postTweet(tweetText);
          if (tweetResult.success) {
            console.log(`[token-tank] Tweet posted: ${tweetResult.tweetUrl}`);
          } else {
            console.error(`[token-tank] Tweet failed: ${tweetResult.error}`);
          }
        } else {
          console.log("[token-tank] Twitter not configured, skipping tweet");
        }

        // Broadcast to SMS subscribers
        await broadcastTokenTankUpdate(twilioClient, sendSmsResponse);

        console.log("[token-tank] Daily broadcast complete.");
      } catch (error) {
        console.error("[token-tank] Daily broadcast failed:", error);
        throw error;
      }
    },
    onError(error) {
      console.error("[token-tank] Scheduler error:", error);
    },
  });

  console.log(
    `[token-tank] Registered daily broadcast for ${DEFAULT_BROADCAST_HOUR}:${String(DEFAULT_BROADCAST_MINUTE).padStart(2, "0")} PT`
  );
}
