/**
 * AX (Amber X/Twitter) Command Handler
 *
 * Subscribe to Amber's Twitter feed via SMS.
 * When Amber posts a tweet, subscribers get an SMS with:
 * - The tweet text
 * - Any URLs/images from the tweet
 *
 * Commands:
 * - AX             → Get info about Amber's Twitter
 * - AX SUBSCRIBE   → Subscribe to tweet notifications
 * - AX UNSUBSCRIBE → Stop notifications
 * - AX HELP        → Show help
 */

import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, normalizeCommandPrefix } from "./command-utils.js";
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from "../lib/agent-subscriptions.js";

// Agent slug for subscriptions
export const AMBER_TWITTER_AGENT_SLUG = "amber-twitter";

const AX_PREFIX = "AX";

function parseAxCommand(messageUpper: string): { subcommand: string } {
  const normalized = normalizeCommandPrefix(messageUpper);

  if (normalized === AX_PREFIX) {
    return { subcommand: "INFO" };
  }

  const parts = normalized.split(/\s+/);
  return { subcommand: parts[1] ?? "INFO" };
}

async function handleInfo(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const isSubscribed = await isSubscribedToAgent(
    context.normalizedFrom,
    AMBER_TWITTER_AGENT_SLUG
  );

  const status = isSubscribed ? "You're subscribed" : "Not subscribed yet";

  await sendSmsResponse(
    from,
    `🐦 Amber's Twitter (@intheamber)\n\n` +
      `${status}\n\n` +
      `Amber tweets twice daily about her creations — interactive art, music, visualizations.\n\n` +
      `AX SUBSCRIBE — get tweet notifications\n` +
      `AX UNSUBSCRIBE — stop notifications`,
    twilioClient
  );

  await updateLastMessageDate(context.normalizedFrom);
  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  await sendSmsResponse(
    from,
    `AX commands:\n` +
      `• AX — info about Amber's Twitter\n` +
      `• AX SUBSCRIBE — get tweet notifications\n` +
      `• AX UNSUBSCRIBE — stop notifications\n` +
      `• AX HELP — this message`,
    twilioClient
  );

  await updateLastMessageDate(context.normalizedFrom);
  return true;
}

async function handleSubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(
      context.normalizedFrom,
      AMBER_TWITTER_AGENT_SLUG
    );

    if (alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're already subscribed to Amber's tweets.",
        twilioClient
      );
      return true;
    }

    const result = await subscribeToAgent(
      context.normalizedFrom,
      AMBER_TWITTER_AGENT_SLUG
    );

    if (result === "missing_subscriber") {
      await sendSmsResponse(
        from,
        "Could not find your subscriber record. Try texting START first.",
        twilioClient
      );
      return true;
    }

    if (result === "error") {
      await sendSmsResponse(
        from,
        "Could not update subscription. Try again later.",
        twilioClient
      );
      return true;
    }

    const confirmationMessage =
      result === "reactivated"
        ? "🐦 Welcome back! You'll get notified when Amber tweets."
        : "🐦 Subscribed to Amber's tweets. I'll text you when she posts.";

    await sendSmsResponse(from, confirmationMessage, twilioClient);
  } catch (error) {
    console.error("[ax] Subscribe error:", error);
    await sendSmsResponse(
      from,
      "Could not update subscription. Try again later.",
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleUnsubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(
      context.normalizedFrom,
      AMBER_TWITTER_AGENT_SLUG
    );

    if (!alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're not subscribed to Amber's tweets.",
        twilioClient
      );
      return true;
    }

    const result = await unsubscribeFromAgent(
      context.normalizedFrom,
      AMBER_TWITTER_AGENT_SLUG
    );

    if (result === "error") {
      await sendSmsResponse(
        from,
        "Could not update subscription. Try again later.",
        twilioClient
      );
      return true;
    }

    await sendSmsResponse(
      from,
      "Unsubscribed from Amber's tweets. Text AX SUBSCRIBE to re-enable.",
      twilioClient
    );
  } catch (error) {
    console.error("[ax] Unsubscribe error:", error);
    await sendSmsResponse(
      from,
      "Could not update subscription. Try again later.",
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

export const axCommandHandler: CommandHandler = {
  name: "ax",
  matches(context) {
    return matchesPrefix(context.messageUpper, AX_PREFIX);
  },
  async handle(context) {
    const { subcommand } = parseAxCommand(context.messageUpper);

    switch (subcommand) {
      case "HELP":
        return handleHelp(context);
      case "SUBSCRIBE":
        return handleSubscribe(context);
      case "UNSUBSCRIBE":
        return handleUnsubscribe(context);
      case "INFO":
      default:
        return handleInfo(context);
    }
  },
};
