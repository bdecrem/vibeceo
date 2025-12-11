/**
 * TT Command Handler - Token Tank Daily Updates
 *
 * Commands:
 * - TT: Get the latest Token Tank update (tweet + blog link)
 * - TT SUBSCRIBE: Subscribe to daily updates
 * - TT UNSUBSCRIBE: Unsubscribe from daily updates
 * - TT HELP: Show available commands
 */

import {
  TOKEN_TANK_AGENT_SLUG,
  getLatestTokenTankUpdate,
  buildTokenTankSmsMessage,
} from "../agents/token-tank/index.js";
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from "../lib/agent-subscriptions.js";
import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, normalizeCommandPrefix } from "./command-utils.js";

const TT_PREFIX = "TT";

function parseTTCommand(messageUpper: string): { subcommand: string } {
  const normalized = normalizeCommandPrefix(messageUpper);

  if (normalized === TT_PREFIX) {
    return { subcommand: "LATEST" };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { subcommand: "LATEST" };
  }

  return { subcommand: parts[1] ?? "LATEST" };
}

async function handleLatest(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;

  try {
    const latest = await getLatestTokenTankUpdate();

    if (!latest) {
      await sendSmsResponse(
        from,
        "No Token Tank updates yet. Check back soon!",
        twilioClient
      );
      return true;
    }

    const message = await buildTokenTankSmsMessage(
      latest.tweetSummary,
      context.normalizedFrom
    );

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error("Failed to fetch Token Tank update:", error);
    await sendSmsResponse(
      from,
      "Could not load Token Tank update. Try again soon.",
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;

  await sendSmsResponse(
    from,
    "TT commands:\n" +
      "- TT: Latest Token Tank update\n" +
      "- TT SUBSCRIBE: Get daily updates\n" +
      "- TT UNSUBSCRIBE: Stop updates\n" +
      "- TT HELP: This message",
    twilioClient
  );

  await updateLastMessageDate(context.normalizedFrom);
  return true;
}

async function handleSubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(
      context.normalizedFrom,
      TOKEN_TANK_AGENT_SLUG
    );

    if (alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're already subscribed to Token Tank.",
        twilioClient
      );
      return true;
    }

    const result = await subscribeToAgent(
      context.normalizedFrom,
      TOKEN_TANK_AGENT_SLUG
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
        "You're already subscribed to Token Tank.",
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
        ? "Welcome back to Token Tank! Daily updates resuming."
        : "Subscribed to Token Tank! You'll get daily updates on the AI incubator experiment.";

    await sendSmsResponse(from, confirmationMessage, twilioClient);
  } catch (error) {
    console.error("Error subscribing to Token Tank:", error);
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
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(
      context.normalizedFrom,
      TOKEN_TANK_AGENT_SLUG
    );

    if (!alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're not subscribed to Token Tank.",
        twilioClient
      );
      return true;
    }

    const result = await unsubscribeFromAgent(
      context.normalizedFrom,
      TOKEN_TANK_AGENT_SLUG
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
      "Unsubscribed from Token Tank. Text TT SUBSCRIBE to get back in.",
      twilioClient
    );
  } catch (error) {
    console.error("Error unsubscribing from Token Tank:", error);
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

export const ttCommandHandler: CommandHandler = {
  name: "tt",
  matches(context) {
    return matchesPrefix(context.messageUpper, TT_PREFIX);
  },
  async handle(context) {
    const { subcommand } = parseTTCommand(context.messageUpper);

    switch (subcommand) {
      case "HELP":
        return handleHelp(context);
      case "SUBSCRIBE":
        return handleSubscribe(context);
      case "UNSUBSCRIBE":
        return handleUnsubscribe(context);
      case "LATEST":
      default:
        return handleLatest(context);
    }
  },
};
