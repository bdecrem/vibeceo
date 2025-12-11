/**
 * Token Tank Daily - SMS + Twitter Distribution
 *
 * Reads the latest blog post from incubator/BLOG.md, extracts the tweetable
 * summary, posts to Twitter, and sends to SMS subscribers.
 *
 * The blog post is written by Arc (the community manager) as part of daily work.
 * This module just handles distribution.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createShortLink } from "../../lib/utils/shortlink-service.js";
import { getAgentSubscribers, markAgentReportSent } from "../../lib/agent-subscriptions.js";
import type { TwilioClient } from "../../lib/sms/webhooks.js";
import { registerDailyJob } from "../../lib/scheduler/index.js";
import { sendSmsResponse } from "../../lib/sms/handlers.js";
import { postTweet, isTwitterConfigured } from "../../lib/twitter-client.js";

export const TOKEN_TANK_AGENT_SLUG = "token-tank";

// Default time: 8:00 AM PT
const DEFAULT_BROADCAST_HOUR = parseInt(process.env.TOKEN_TANK_BROADCAST_HOUR || "8", 10);
const DEFAULT_BROADCAST_MINUTE = parseInt(process.env.TOKEN_TANK_BROADCAST_MINUTE || "0", 10);

// Path to incubator folder (relative to sms-bot)
const INCUBATOR_PATH = path.resolve(
  process.cwd(),
  process.env.INCUBATOR_PATH || "../incubator"
);

// Blog URL base
const BLOG_BASE_URL = "https://tokentank.io/token-tank/#blog";

interface LatestBlogPost {
  date: string;
  title: string;
  tweetSummary: string;
  fullContent: string;
}

/**
 * Read and parse the latest blog post from BLOG.md
 *
 * Expected format:
 * ## December 10, 2025: Title Here
 *
 * > Tweetable summary under 280 characters.
 *
 * Full content...
 */
export async function getLatestBlogPost(): Promise<LatestBlogPost | null> {
  const blogPath = path.join(INCUBATOR_PATH, "BLOG.md");

  try {
    const content = await fs.readFile(blogPath, "utf-8");

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

      // Validate it's under 280 chars (tweet limit)
      if (tweetSummary.length > 280) {
        console.warn(`[token-tank] Tweet summary too long (${tweetSummary.length} chars), truncating`);
      }

      return {
        date: dateStr,
        title,
        tweetSummary: tweetSummary.substring(0, 280),
        fullContent: section.trim(),
      };
    }

    return null;
  } catch (error) {
    console.error("[token-tank] Failed to read BLOG.md:", error);
    return null;
  }
}

/**
 * Build the SMS message: tweet text + link to blog
 */
export async function buildTokenTankSmsMessage(
  tweetSummary: string,
  recipient: string
): Promise<string> {
  // Create shortlink to the blog
  const shortLink = await createShortLink(BLOG_BASE_URL, {
    context: "token-tank-blog",
    createdFor: recipient,
    createdBy: "sms-bot",
  });

  const link = shortLink || BLOG_BASE_URL;

  return `${tweetSummary}\n\n${link}`;
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

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      const message = await buildTokenTankSmsMessage(
        post.tweetSummary,
        subscriber.phone_number
      );

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
 * Note: This does NOT generate the blog post. Arc writes the blog post
 * as part of daily work. This job just broadcasts it.
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
