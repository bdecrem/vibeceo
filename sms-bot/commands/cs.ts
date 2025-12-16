/**
 * CS Command Handler - Content Sharing (Link Feed)
 *
 * Commands:
 * - CS <url> [note]: Share a URL (broadcasts to all subscribers)
 * - CS SUBSCRIBE: Subscribe to link broadcasts
 * - CS UNSUBSCRIBE: Unsubscribe from link broadcasts
 * - CS LIST: Get recent links
 * - CS HELP: Show available commands
 */

import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
  getAgentSubscribers,
} from "../lib/agent-subscriptions.js";
import { getSubscriber } from "../lib/subscribers.js";
import { supabase } from "../lib/supabase.js";
import { sendSmsResponse, setPendingCS } from "../lib/sms/handlers.js";
import type { TwilioClient } from "../lib/sms/webhooks.js";
import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, extractAfterPrefix } from "./command-utils.js";

const CS_PREFIX = "CS";
export const CS_AGENT_SLUG = "cs";

interface ParsedCSCommand {
  subcommand: "SUBSCRIBE" | "UNSUBSCRIBE" | "POST" | "LIST" | "HELP" | "PENDING";
  url?: string;
  notes?: string;
}

// Strip surrounding quotes from a URL
function stripQuotes(url: string): string {
  return url.replace(/^["']|["']$/g, "");
}

function parseCSCommand(message: string, messageUpper: string): ParsedCSCommand {
  const afterPrefix = extractAfterPrefix(message, messageUpper, CS_PREFIX).trim();
  const afterPrefixUpper = afterPrefix.toUpperCase();

  // Check for subcommands
  if (afterPrefixUpper === "HELP") {
    return { subcommand: "HELP" };
  }
  if (afterPrefixUpper === "SUBSCRIBE" || afterPrefixUpper === "SUB") {
    return { subcommand: "SUBSCRIBE" };
  }
  if (afterPrefixUpper === "UNSUBSCRIBE" || afterPrefixUpper === "UNSUB") {
    return { subcommand: "UNSUBSCRIBE" };
  }
  if (afterPrefixUpper === "LIST" || afterPrefixUpper === "RECENT") {
    return { subcommand: "LIST" };
  }

  // If just "CS" with nothing after, wait for URL follow-up (iMessage splitting)
  if (!afterPrefix) {
    return { subcommand: "PENDING" };
  }

  // Check for URL (may be wrapped in quotes)
  const urlMatch = afterPrefix.match(/["']?(https?:\/\/[^\s"']+)["']?/i);
  if (urlMatch) {
    const url = stripQuotes(urlMatch[1]);
    // Everything after the URL is notes
    const urlEndIndex = afterPrefix.indexOf(urlMatch[0]) + urlMatch[0].length;
    const afterUrl = afterPrefix.substring(urlEndIndex).trim();
    return {
      subcommand: "POST",
      url,
      notes: afterUrl || undefined,
    };
  }

  // Default to help if no URL found
  return { subcommand: "HELP" };
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function broadcastNewLink(
  twilioClient: TwilioClient,
  poster: { phone: string; name?: string },
  url: string,
  domain: string,
  notes?: string
): Promise<{ sent: number; failed: number }> {
  const subscribers = await getAgentSubscribers(CS_AGENT_SLUG);

  if (subscribers.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const posterName = poster.name || "Someone";
  const message = notes
    ? `📎 ${posterName} shared:\n${url}\n"${notes}"`
    : `📎 ${posterName} shared:\n${url}`;

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    // Skip the poster
    if (sub.phone_number === poster.phone) continue;

    try {
      await sendSmsResponse(sub.phone_number, message, twilioClient);
      sent++;
      // Rate limit
      await new Promise((r) => setTimeout(r, 150));
    } catch (error) {
      console.error(`[cs] Failed to send to ${sub.phone_number}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

async function handlePost(context: CommandContext, url: string, notes?: string): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  try {
    // Get subscriber info
    const subscriber = await getSubscriber(normalizedFrom);
    const subscriberId = subscriber?.id || null;
    const posterName = subscriber?.personalization?.name || null;

    const domain = extractDomain(url);

    // Store in database
    const { error } = await supabase.from("cs_content").insert({
      subscriber_id: subscriberId,
      posted_by_phone: normalizedFrom,
      posted_by_name: posterName,
      url,
      domain,
      notes,
      posted_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[cs] Failed to store URL:", error);
      await sendSms(from, "Could not save link. Try again later.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Broadcast to subscribers
    const { sent } = await broadcastNewLink(
      twilioClient,
      { phone: normalizedFrom, name: posterName || undefined },
      url,
      domain,
      notes
    );

    // Confirm to poster
    const confirmation = sent > 0
      ? `✓ Shared to ${sent} subscriber${sent === 1 ? "" : "s"}. View all: kochi.to/cs`
      : `✓ Saved. View all: kochi.to/cs`;

    await sendSms(from, confirmation, twilioClient);
  } catch (error) {
    console.error("[cs] Error in handlePost:", error);
    await sendSms(from, "Something went wrong. Try again later.", twilioClient);
  }

  await updateLastMessageDate(normalizedFrom);
  return true;
}

async function handleSubscribe(context: CommandContext): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(normalizedFrom, CS_AGENT_SLUG);

    if (alreadySubscribed) {
      await sendSms(from, "You're already subscribed to CS links.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    const result = await subscribeToAgent(normalizedFrom, CS_AGENT_SLUG);

    if (result === "missing_subscriber") {
      await sendSms(from, "Text START first to join Kochi.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    if (result === "error") {
      await sendSms(from, "Could not subscribe. Try again later.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    await sendSms(
      from,
      "Subscribed to CS! You'll get links when others share them.\nShare: CS <url>\nView all: kochi.to/cs",
      twilioClient
    );
  } catch (error) {
    console.error("[cs] Error subscribing:", error);
    await sendSms(from, "Could not subscribe. Try again later.", twilioClient);
  }

  await updateLastMessageDate(normalizedFrom);
  return true;
}

async function handleUnsubscribe(context: CommandContext): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  try {
    const isSubscribed = await isSubscribedToAgent(normalizedFrom, CS_AGENT_SLUG);

    if (!isSubscribed) {
      await sendSms(from, "You're not subscribed to CS links.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    const result = await unsubscribeFromAgent(normalizedFrom, CS_AGENT_SLUG);

    if (result === "error") {
      await sendSms(from, "Could not unsubscribe. Try again later.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    await sendSms(from, "Unsubscribed from CS. Text CS SUBSCRIBE to rejoin.", twilioClient);
  } catch (error) {
    console.error("[cs] Error unsubscribing:", error);
    await sendSms(from, "Could not unsubscribe. Try again later.", twilioClient);
  }

  await updateLastMessageDate(normalizedFrom);
  return true;
}

async function handleList(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate, normalizedFrom } = context;

  try {
    const { data, error } = await supabase
      .from("cs_content")
      .select("url, domain, posted_by_name, posted_at, notes")
      .order("posted_at", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      await sendSms(from, "No links yet. Be the first: CS <url>", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    const lines = data.map((item) => {
      const name = item.posted_by_name || "Anonymous";
      const domain = item.domain || "link";
      return `• ${domain} (${name})`;
    });

    const message = `Recent links:\n${lines.join("\n")}\n\nView all: kochi.to/cs`;
    await sendSms(from, message, twilioClient);
  } catch (error) {
    console.error("[cs] Error listing:", error);
    await sendSms(from, "Could not get links. Try again later.", twilioClient);
  }

  await updateLastMessageDate(normalizedFrom);
  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate, normalizedFrom } = context;

  await sendSms(
    from,
    "CS commands:\n" +
      "• CS <url> — Share a link\n" +
      "• CS <url> your note — Share with comment\n" +
      "• CS SUBSCRIBE — Get notified\n" +
      "• CS LIST — Recent links\n" +
      "View all: kochi.to/cs",
    twilioClient
  );

  await updateLastMessageDate(normalizedFrom);
  return true;
}

export const csCommandHandler: CommandHandler = {
  name: "cs",
  matches(context) {
    return matchesPrefix(context.messageUpper, CS_PREFIX);
  },
  async handle(context) {
    const parsed = parseCSCommand(context.message, context.messageUpper);

    switch (parsed.subcommand) {
      case "SUBSCRIBE":
        return handleSubscribe(context);
      case "UNSUBSCRIBE":
        return handleUnsubscribe(context);
      case "POST":
        return handlePost(context, parsed.url!, parsed.notes);
      case "LIST":
        return handleList(context);
      case "PENDING":
        // Just "CS" received - wait up to 30s for URL follow-up (iMessage splitting)
        setPendingCS(context.normalizedFrom);
        await context.updateLastMessageDate(context.normalizedFrom);
        return true; // Handled, no response - silently waiting
      case "HELP":
      default:
        return handleHelp(context);
    }
  },
};

/**
 * Handle a pending CS post - called from handlers.ts when URL arrives after "CS"
 */
export async function handlePendingCSPost(context: CommandContext, url: string): Promise<boolean> {
  return handlePost(context, url);
}
