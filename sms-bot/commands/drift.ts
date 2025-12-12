/**
 * $DRIFT Command Handler - Drift Trading Agent Notifications
 *
 * Commands:
 * - $DRIFT: Show status and help
 * - $DRIFT SUBSCRIBE: Subscribe to Drift trade alerts
 * - $DRIFT UNSUBSCRIBE: Unsubscribe from alerts
 */

import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from "../lib/agent-subscriptions.js";
import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, normalizeCommandPrefix } from "./command-utils.js";

export const DRIFT_AGENT_SLUG = "drift-trader";
const DRIFT_PREFIX = "$DRIFT";

function parseDriftCommand(messageUpper: string): { subcommand: string } {
  const normalized = normalizeCommandPrefix(messageUpper);

  if (normalized === DRIFT_PREFIX) {
    return { subcommand: "HELP" };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { subcommand: "HELP" };
  }

  return { subcommand: parts[1] ?? "HELP" };
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const isSubscribed = await isSubscribedToAgent(
    context.normalizedFrom,
    DRIFT_AGENT_SLUG
  );

  const status = isSubscribed ? "You're subscribed" : "Not subscribed";

  await sendSmsResponse(
    from,
    `Drift (i3-2) — The Reasoning Trader\n\n` +
      `${status} to trade alerts.\n\n` +
      `Commands:\n` +
      `$DRIFT SUBSCRIBE — Get real-time trade alerts\n` +
      `$DRIFT UNSUBSCRIBE — Stop alerts`,
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
      DRIFT_AGENT_SLUG
    );

    if (alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're already subscribed to Drift trade alerts.",
        twilioClient
      );
      return true;
    }

    const result = await subscribeToAgent(
      context.normalizedFrom,
      DRIFT_AGENT_SLUG
    );

    if (result === "missing_subscriber") {
      await sendSmsResponse(
        from,
        "Could not find your subscriber record. Try texting START first.",
        twilioClient
      );
      return true;
    }

    if (result === "already") {
      await sendSmsResponse(
        from,
        "You're already subscribed to Drift trade alerts.",
        twilioClient
      );
      return true;
    }

    if (result === "error") {
      await sendSmsResponse(
        from,
        "Could not subscribe. Please try again later.",
        twilioClient
      );
      return true;
    }

    const confirmationMessage =
      result === "reactivated"
        ? "Welcome back! Drift trade alerts resuming."
        : "Subscribed to Drift! You'll get real-time alerts when Drift executes trades.";

    await sendSmsResponse(from, confirmationMessage, twilioClient);
  } catch (error) {
    console.error("Error subscribing to Drift:", error);
    await sendSmsResponse(
      from,
      "Could not subscribe. Please try again later.",
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
      DRIFT_AGENT_SLUG
    );

    if (!alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're not subscribed to Drift trade alerts.",
        twilioClient
      );
      return true;
    }

    const result = await unsubscribeFromAgent(
      context.normalizedFrom,
      DRIFT_AGENT_SLUG
    );

    if (result === "missing_subscriber") {
      await sendSmsResponse(
        from,
        "Could not find your subscriber record.",
        twilioClient
      );
      return true;
    }

    if (result === "error") {
      await sendSmsResponse(
        from,
        "Could not unsubscribe. Please try again later.",
        twilioClient
      );
      return true;
    }

    await sendSmsResponse(
      from,
      "Unsubscribed from Drift. Text $DRIFT SUBSCRIBE to get back in.",
      twilioClient
    );
  } catch (error) {
    console.error("Error unsubscribing from Drift:", error);
    await sendSmsResponse(
      from,
      "Could not unsubscribe. Please try again later.",
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

export const driftCommandHandler: CommandHandler = {
  name: "drift",
  matches(context) {
    return matchesPrefix(context.messageUpper, DRIFT_PREFIX);
  },
  async handle(context) {
    const { subcommand } = parseDriftCommand(context.messageUpper);

    switch (subcommand) {
      case "SUBSCRIBE":
      case "SUB":
        return handleSubscribe(context);
      case "UNSUBSCRIBE":
      case "UNSUB":
        return handleUnsubscribe(context);
      case "HELP":
      default:
        return handleHelp(context);
    }
  },
};
