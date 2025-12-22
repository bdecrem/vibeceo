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
import { fetchAndSummarizeLink } from "../lib/cs-content-fetcher.js";
import { storeThreadState, clearThreadState, type ActiveThread } from "../lib/context-loader.js";
import { sendNotificationEmail } from "../lib/email/sendgrid.js";
import type { TwilioClient } from "../lib/sms/webhooks.js";
import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, extractAfterPrefix } from "./command-utils.js";

const CS_PREFIX = "CS";
export const CS_AGENT_SLUG = "cs";

// Admin for CS invite approvals
const CS_ADMIN_EMAIL = "bdecrem@gmail.com";
const CS_ADMIN_PHONE = "+16508989508";  // For SMS-based approval commands

interface ParsedCSCommand {
  subcommand: "SUBSCRIBE" | "UNSUBSCRIBE" | "POST" | "LIST" | "HELP" | "PENDING" | "COMMENT" | "KOCHI" | "APPROVE";
  url?: string;
  notes?: string;
  aboutPerson?: string;
  text?: string;      // For COMMENT
  question?: string;  // For KOCHI
  approvePhone?: string;  // For APPROVE
}

// Strip surrounding quotes from a URL
function stripQuotes(url: string): string {
  return url.replace(/^["']|["']$/g, "");
}

// Normalize a person's name: initial caps, trim whitespace
function normalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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

  // Check for APPROVE command (admin only)
  if (afterPrefixUpper.startsWith("APPROVE") || afterPrefixUpper.startsWith("OK ") || afterPrefixUpper === "OK" || afterPrefixUpper === "Y" || afterPrefixUpper === "YES") {
    // Extract phone number - could be "APPROVE +1234567890" or "OK +1234567890" or just "Y" (uses thread state)
    const phoneMatch = afterPrefix.match(/[\d+][\d\s()-]+/);
    const approvePhone = phoneMatch ? phoneMatch[0].replace(/[\s()-]/g, '') : undefined;
    return { subcommand: "APPROVE", approvePhone };
  }

  // Check for KOCHI AI question
  if (afterPrefixUpper.startsWith("KOCHI")) {
    const question = afterPrefix.substring(5).trim(); // Remove "KOCHI"
    return { subcommand: "KOCHI", question };
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
    let afterUrl = afterPrefix.substring(urlEndIndex).trim();

    // Extract person: field (1-2 words)
    let aboutPerson: string | undefined;
    const personMatch = afterUrl.match(/\bperson:\s*(\S+(?:\s+\S+)?)/i);
    if (personMatch) {
      aboutPerson = normalizeName(personMatch[1]);
      // Remove person: from notes
      afterUrl = afterUrl.replace(personMatch[0], '').trim();
    }

    // Auto-detect LinkedIn profile URLs (not posts/feed)
    if (!aboutPerson && url.includes('linkedin.com/in/')) {
      const linkedInMatch = url.match(/linkedin\.com\/in\/([^/?]+)/);
      if (linkedInMatch) {
        // Convert slug to readable name: john-doe-2496ba82 -> John Doe
        // Filter out trailing numeric IDs (alphanumeric segments with digits)
        const rawName = linkedInMatch[1]
          .split('-')
          .filter(word => !/\d/.test(word)) // Remove segments containing digits
          .join(' ');
        aboutPerson = normalizeName(rawName);
      }
    }

    return {
      subcommand: "POST",
      url,
      notes: afterUrl || undefined,
      aboutPerson,
    };
  }

  // No URL found - treat as comment on recent link
  return { subcommand: "COMMENT", text: afterPrefix };
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ============ Waitlist Functions ============

interface WaitlistEntry {
  id: string;
  phone: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  name?: string;
}

/**
 * Check if phone is on the waitlist (pending)
 */
async function isOnWaitlist(phone: string): Promise<boolean> {
  const { data } = await supabase
    .from('cs_waitlist')
    .select('id')
    .eq('phone', phone)
    .eq('status', 'pending')
    .maybeSingle();
  return !!data;
}

/**
 * Add phone to the CS waitlist, returns the entry ID on success
 */
async function addToWaitlist(phone: string, name?: string): Promise<{ status: 'added' | 'already' | 'error'; id?: string }> {
  // Check if already on waitlist
  const existing = await isOnWaitlist(phone);
  if (existing) {
    return { status: 'already' };
  }

  const { data, error } = await supabase
    .from('cs_waitlist')
    .insert({
      phone,
      name: name || null,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[cs] Failed to add to waitlist:', error);
    return { status: 'error' };
  }

  return { status: 'added', id: data.id };
}

/**
 * Approve a waitlist entry and subscribe the user
 */
async function approveWaitlistEntry(phone: string): Promise<'approved' | 'not_found' | 'error'> {
  // Find the pending entry
  const { data: entry, error: findError } = await supabase
    .from('cs_waitlist')
    .select('id, name')
    .eq('phone', phone)
    .eq('status', 'pending')
    .maybeSingle();

  if (findError || !entry) {
    return 'not_found';
  }

  // Update status to approved
  const { error: updateError } = await supabase
    .from('cs_waitlist')
    .update({ status: 'approved' })
    .eq('id', entry.id);

  if (updateError) {
    console.error('[cs] Failed to update waitlist status:', updateError);
    return 'error';
  }

  // Subscribe the user
  const result = await subscribeToAgent(phone, CS_AGENT_SLUG);
  if (result === 'error' || result === 'missing_subscriber') {
    console.error('[cs] Failed to subscribe approved user:', result);
    return 'error';
  }

  return 'approved';
}

/**
 * Get the most recent pending waitlist entry (for "Y" approval without phone)
 */
async function getMostRecentPendingWaitlist(): Promise<WaitlistEntry | null> {
  const { data } = await supabase
    .from('cs_waitlist')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as WaitlistEntry | null;
}

// ============================================

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

  const handle = poster.name || "someone";
  const message = notes
    ? `📎 ${handle} shared: ${url}\n"${notes}" — 💬 ctrlshift.so/links`
    : `📎 ${handle} shared: ${url} — 💬 ctrlshift.so/links`;

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

/**
 * Broadcast a message to all CS subscribers
 * @param excludePhone - Phone to exclude from broadcast (e.g., the sender), or null to include everyone
 */
async function broadcastToSubscribers(
  twilioClient: TwilioClient,
  message: string,
  excludePhone: string | null
): Promise<{ sent: number; failed: number }> {
  const subscribers = await getAgentSubscribers(CS_AGENT_SLUG);

  if (subscribers.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    // Optionally skip the sender
    if (excludePhone && sub.phone_number === excludePhone) continue;

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

async function handlePost(context: CommandContext, url: string, notes?: string, aboutPerson?: string): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  try {
    // Get subscriber info
    const subscriber = await getSubscriber(normalizedFrom);
    const subscriberId = subscriber?.id || null;
    // Prefer handle over name for CS posts
    const posterHandle = subscriber?.personalization?.handle || subscriber?.personalization?.name || null;

    const domain = extractDomain(url);

    // Store in database
    const { data: inserted, error } = await supabase
      .from("cs_content")
      .insert({
        subscriber_id: subscriberId,
        posted_by_phone: normalizedFrom,
        posted_by_name: posterHandle,
        url,
        domain,
        notes,
        about_person: aboutPerson || null,
        posted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("[cs] Failed to store URL:", error);
      await sendSms(from, "Could not save link. Try again later.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Fetch and summarize content asynchronously (don't await)
    fetchAndSummarizeLink(inserted.id, url).catch((err) => {
      console.error("[cs] Background content fetch failed:", err);
    });

    // Broadcast to subscribers
    const { sent } = await broadcastNewLink(
      twilioClient,
      { phone: normalizedFrom, name: posterHandle || undefined },
      url,
      domain,
      notes
    );

    // Confirm to poster
    const confirmation = sent > 0
      ? `✓ Shared to ${sent} subscriber${sent === 1 ? "" : "s"} — 💬 ctrlshift.so/links`
      : `✓ Saved — 💬 ctrlshift.so/links`;

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
    // Check if already subscribed
    const alreadySubscribed = await isSubscribedToAgent(normalizedFrom, CS_AGENT_SLUG);

    if (alreadySubscribed) {
      await sendSms(from, "You're already in! Share links: CS <url>", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Check if already on waitlist
    const alreadyWaitlisted = await isOnWaitlist(normalizedFrom);
    if (alreadyWaitlisted) {
      await sendSms(from, "You're on the waitlist! We'll text you when you're in.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Get subscriber info for the name
    const subscriber = await getSubscriber(normalizedFrom);
    if (!subscriber) {
      await sendSms(from, "Text START first to join Kochi.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    const name = subscriber.personalization?.handle || subscriber.personalization?.name || null;

    // Add to waitlist
    const waitlistResult = await addToWaitlist(normalizedFrom, name);
    if (waitlistResult.status === 'error') {
      await sendSms(from, "Could not process request. Try again later.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Notify admin via email (SMS gets blocked by Twilio spam filters)
    const displayName = name || 'Someone';
    const approveUrl = `https://ctrlshift.so/links/q/${waitlistResult.id}`;
    await sendNotificationEmail(
      CS_ADMIN_EMAIL,
      `CS invite request: ${displayName}`,
      `${displayName} is requesting access to CTRL Shift.`,
      approveUrl,
      'Review & Approve'
    );

    // Confirm to user
    await sendSms(
      from,
      "Request received! You're on the waitlist — we'll text you when you're in.",
      twilioClient
    );

  } catch (error) {
    console.error("[cs] Error in subscribe/waitlist:", error);
    await sendSms(from, "Could not process request. Try again later.", twilioClient);
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

async function handleApprove(context: CommandContext, approvePhone?: string): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  // Only admin can approve
  if (normalizedFrom !== CS_ADMIN_PHONE) {
    // Silent ignore - don't reveal admin features
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  try {
    let phoneToApprove = approvePhone;

    // If no phone provided, use the most recent pending request
    if (!phoneToApprove) {
      const recentPending = await getMostRecentPendingWaitlist();
      if (!recentPending) {
        await sendSms(from, "No pending invite requests.", twilioClient);
        await updateLastMessageDate(normalizedFrom);
        return true;
      }
      phoneToApprove = recentPending.phone;
    }

    // Normalize the phone number
    if (!phoneToApprove.startsWith('+')) {
      phoneToApprove = '+1' + phoneToApprove.replace(/\D/g, '');
    }

    // Approve and subscribe
    const result = await approveWaitlistEntry(phoneToApprove);

    if (result === 'not_found') {
      await sendSms(from, `No pending request for ${phoneToApprove}`, twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    if (result === 'error') {
      await sendSms(from, `Failed to approve ${phoneToApprove}. Try again.`, twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Get user's name for the welcome message
    const subscriber = await getSubscriber(phoneToApprove);
    const existingHandle = subscriber?.personalization?.handle;

    // Send "you're in" message to approved user
    if (existingHandle) {
      await sendSms(
        phoneToApprove,
        `You're in! Welcome to CTRL SHIFT, ${existingHandle}.\n\nText CS + any URL to share with the group.\nSee everything at ctrlshift.so/links`,
        twilioClient
      );
    } else {
      // Ask for handle
      if (subscriber?.id) {
        await storeThreadState(subscriber.id, {
          handler: 'cs-handle-setup',
          topic: 'handle setup',
          context: {},
        });
      }
      await sendSms(
        phoneToApprove,
        "You're in! Welcome to CTRL SHIFT.\n\nPick a handle — reply with one word (like 'roxi')",
        twilioClient
      );
    }

    // Confirm to admin
    const displayName = subscriber?.personalization?.handle || subscriber?.personalization?.name || phoneToApprove;
    await sendSms(from, `✓ Approved ${displayName}`, twilioClient);

  } catch (error) {
    console.error("[cs] Error in handleApprove:", error);
    await sendSms(from, "Something went wrong. Try again.", twilioClient);
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

    const message = `Recent links:\n${lines.join("\n")}\n\n💬 ctrlshift.so/links — full feed`;
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
      "• CS <text> — Comment on recent link\n" +
      "• CS KOCHI <question> — Ask AI\n" +
      "• CS SUBSCRIBE — Get notified\n" +
      "💬 ctrlshift.so/links — full feed",
    twilioClient
  );

  await updateLastMessageDate(normalizedFrom);
  return true;
}

/**
 * Handle CS comment - add comment to most recent active post
 */
async function handleCSComment(context: CommandContext, text: string): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  try {
    // Find posts with recent activity (post time or last comment within 30 mins)
    const { data: recentPosts } = await supabase
      .from("cs_content")
      .select("id, url, domain, posted_by_name, posted_by_phone, comments, posted_at")
      .order("posted_at", { ascending: false })
      .limit(5);

    // Find post with activity in last 30 mins
    const cutoff = Date.now() - 30 * 60 * 1000;
    const activePost = recentPosts?.find(post => {
      const postTime = new Date(post.posted_at).getTime();
      const comments = post.comments as Array<{ created_at: string }> | null;
      const lastCommentTime = comments?.length
        ? new Date(comments[comments.length - 1].created_at).getTime()
        : 0;
      const lastActivity = Math.max(postTime, lastCommentTime);
      return lastActivity >= cutoff;
    });

    if (!activePost) {
      await sendSms(from, "No recent link to comment on. Share: CS <url>", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Get user's handle (prefer handle, fall back to name)
    const subscriber = await getSubscriber(normalizedFrom);
    const handle = subscriber?.personalization?.handle || subscriber?.personalization?.name || "Anonymous";

    // Add comment to post (same format as web comments)
    const newComment = {
      id: crypto.randomUUID(),
      author: handle,
      text: text,
      created_at: new Date().toISOString(),
    };

    const existingComments = (activePost.comments as Array<unknown>) || [];
    const { error } = await supabase
      .from("cs_content")
      .update({ comments: [...existingComments, newComment] })
      .eq("id", activePost.id);

    if (error) {
      console.error("[cs] Failed to add comment:", error);
      await sendSms(from, "Could not add comment. Try again.", twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }

    // Broadcast comment to all subscribers (include the commenter)
    const broadcastMsg = `💬 ${handle} on ${activePost.domain}: "${text}" — ctrlshift.so/links`;
    await broadcastToSubscribers(twilioClient, broadcastMsg, null);

  } catch (error) {
    console.error("[cs] Error in handleCSComment:", error);
    await sendSms(from, "Something went wrong. Try again.", twilioClient);
  }

  await updateLastMessageDate(normalizedFrom);
  return true;
}

/**
 * Handle CS KOCHI - AI-powered search, broadcast Q&A to all subscribers
 * Also saves question and answer as comments on the most recent active post
 */
async function handleCSKochi(context: CommandContext, question: string): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  if (!question || question.length < 3) {
    await sendSms(from, "CS KOCHI <question>. Example: CS KOCHI what are the themes?", twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Get user's handle (prefer handle, fall back to name)
  const subscriber = await getSubscriber(normalizedFrom);
  const handle = subscriber?.personalization?.handle || subscriber?.personalization?.name || "Someone";

  try {
    // Find most recent active post to attach Q&A as comments
    const { data: recentPosts } = await supabase
      .from("cs_content")
      .select("id, domain, comments, posted_at")
      .order("posted_at", { ascending: false })
      .limit(5);

    const cutoff = Date.now() - 30 * 60 * 1000;
    const activePost = recentPosts?.find(post => {
      const postTime = new Date(post.posted_at).getTime();
      const comments = post.comments as Array<{ created_at: string }> | null;
      const lastCommentTime = comments?.length
        ? new Date(comments[comments.length - 1].created_at).getTime()
        : 0;
      const lastActivity = Math.max(postTime, lastCommentTime);
      return lastActivity >= cutoff;
    });

    // 1. Broadcast the question to all subscribers
    const questionMsg = `💭 ${handle} asks: "${question}"`;
    await broadcastToSubscribers(twilioClient, questionMsg, null);

    // 2. Run AI search
    const { runCSChat } = await import("../agents/cs-chat/index.js");
    const result = await runCSChat(question);

    // 3. Truncate answer for SMS
    const answer = result.answer.length > 400
      ? result.answer.substring(0, 397) + "..."
      : result.answer;

    // 4. Save Q&A as comments on active post (if one exists)
    if (activePost) {
      const questionComment = {
        id: crypto.randomUUID(),
        author: handle,
        text: `🔍 ${question}`,
        created_at: new Date().toISOString(),
      };
      const answerComment = {
        id: crypto.randomUUID(),
        author: "Kochi",
        text: result.answer, // Full answer for website (not truncated)
        created_at: new Date().toISOString(),
      };

      const existingComments = (activePost.comments as Array<unknown>) || [];
      await supabase
        .from("cs_content")
        .update({ comments: [...existingComments, questionComment, answerComment] })
        .eq("id", activePost.id);
    }

    // 5. Broadcast the answer to all subscribers
    const answerMsg = `🤖 ${answer}\n\nctrlshift.so/links 💬`;
    await broadcastToSubscribers(twilioClient, answerMsg, null);

  } catch (error) {
    console.error("[cs-kochi] Error:", error);
    await sendSms(from, "Could not search. Try again.", twilioClient);
  }

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
        return handlePost(context, parsed.url!, parsed.notes, parsed.aboutPerson);
      case "LIST":
        return handleList(context);
      case "COMMENT":
        return handleCSComment(context, parsed.text!);
      case "KOCHI":
        return handleCSKochi(context, parsed.question || "");
      case "APPROVE":
        return handleApprove(context, parsed.approvePhone);
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

/**
 * Handle CS handle setup - called from orchestrated-routing when user replies with handle
 */
export async function handleCSHandleSetup(
  context: CommandContext,
  activeThread: ActiveThread
): Promise<boolean> {
  const { from, normalizedFrom, message, twilioClient, sendSmsResponse: sendSms, updateLastMessageDate } = context;

  // Extract single word (the handle)
  const handle = message.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);

  if (!handle || handle.length < 2) {
    await sendSms(
      from,
      "Pick a one-word handle (2-20 letters/numbers, like 'roxi'):",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  try {
    const subscriber = await getSubscriber(normalizedFrom);
    if (!subscriber) {
      await sendSms(from, "Could not find your account. Try CS SUBSCRIBE again.", twilioClient);
      return true;
    }

    // Save handle to personalization
    const newPersonalization = { ...subscriber.personalization, handle };
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ personalization: newPersonalization })
      .eq('id', subscriber.id);

    if (error) {
      console.error('[cs] Failed to save handle:', error);
      await sendSms(from, "Could not save handle. Try again later.", twilioClient);
      return true;
    }

    // Clear thread state
    await clearThreadState(subscriber.id);

    await sendSms(
      from,
      `All set. Share links by texting CS + any URL. See the feed at ctrlshift.so/links 💬`,
      twilioClient
    );
  } catch (error) {
    console.error('[cs] Error in handle setup:', error);
    await sendSms(from, "Something went wrong. Try CS SUBSCRIBE again.", twilioClient);
  }

  await updateLastMessageDate(normalizedFrom);
  return true;
}
