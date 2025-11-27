import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, normalizeCommandPrefix } from "./command-utils.js";
import {
  getSubscriber,
  setAnnouncementsSubscription
} from "../lib/subscribers.js";

const ANNOUNCEMENTS_PREFIX = "ANNOUNCEMENTS";

function parseAnnouncementsCommand(messageUpper: string): { subcommand: string } {
  const normalized = normalizeCommandPrefix(messageUpper);

  // Just "ANNOUNCEMENTS"
  if (normalized === ANNOUNCEMENTS_PREFIX) {
    return { subcommand: "SUBSCRIBE" };
  }

  // Extract subcommand
  const afterPrefix = normalized.substring(ANNOUNCEMENTS_PREFIX.length).trim();
  const parts = afterPrefix.split(/\s+/);

  return { subcommand: parts[0] || "SUBSCRIBE" };
}

async function handleSubscribe(context: CommandContext): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Check if subscriber exists
  const subscriber = await getSubscriber(normalizedFrom);

  if (!subscriber) {
    await sendSmsResponse(
      from,
      "Text START to join Kochi first, then send ANNOUNCEMENTS to subscribe.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Check if already subscribed
  if (subscriber.announcements_subscribed) {
    await sendSmsResponse(
      from,
      "You're already subscribed to Kochi updates! Reply ANNOUNCEMENTS STOP to unsubscribe.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Subscribe the user
  const updated = await setAnnouncementsSubscription(normalizedFrom, true);

  if (!updated) {
    await sendSmsResponse(
      from,
      "We could not update your subscription. Please try again later.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Send confirmation message
  await sendSmsResponse(
    from,
    "Subscribed to Kochi updates! Reply STOP to unsubscribe forever (we literally can't text you again).",
    twilioClient
  );

  await updateLastMessageDate(normalizedFrom);
  return true;
}

async function handleStop(context: CommandContext): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Check if subscriber exists
  const subscriber = await getSubscriber(normalizedFrom);

  if (!subscriber || !subscriber.announcements_subscribed) {
    await sendSmsResponse(
      from,
      "You are not currently subscribed to Kochi announcements. Text ANNOUNCEMENTS to opt in.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Unsubscribe the user
  const updated = await setAnnouncementsSubscription(normalizedFrom, false);

  if (!updated) {
    await sendSmsResponse(
      from,
      "We could not update your settings. Please try again later.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Send confirmation message
  await sendSmsResponse(
    from,
    "Unsubscribed from Kochi announcements. You can still chat normally. Text ANNOUNCEMENTS to re-subscribe.",
    twilioClient
  );

  await updateLastMessageDate(normalizedFrom);
  return true;
}

export const announcementsCommandHandler: CommandHandler = {
  name: "announcements",
  matches(context) {
    // Check if message starts with "ANNOUNCEMENTS" followed by space or end
    const normalized = normalizeCommandPrefix(context.messageUpper);
    return normalized === ANNOUNCEMENTS_PREFIX || normalized.startsWith(ANNOUNCEMENTS_PREFIX + " ");
  },
  async handle(context) {
    const { subcommand } = parseAnnouncementsCommand(context.messageUpper);

    if (subcommand === "SUBSCRIBE" || subcommand === ANNOUNCEMENTS_PREFIX) {
      return handleSubscribe(context);
    }

    if (subcommand === "STOP" || subcommand === "UNSUBSCRIBE") {
      return handleStop(context);
    }

    // Unknown subcommand
    await context.sendSmsResponse(
      context.from,
      "Unknown ANNOUNCEMENTS command. Text ANNOUNCEMENTS to subscribe or ANNOUNCEMENTS STOP to unsubscribe.",
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  },
};
