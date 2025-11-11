import {
  CRYPTO_AGENT_SLUG,
  buildCryptoReportMessage,
  getLatestStoredCryptoReport,
  runAndStoreCryptoReport,
} from "../agents/crypto-research/index.js";
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from "../lib/agent-subscriptions.js";
import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, normalizeCommandPrefix } from "./command-utils.js";

const CRYPTO_PREFIX = "CRYPTO";
const ADMIN_PHONE = "+16508989508";

function parseCryptoCommand(messageUpper: string): { subcommand: string } {
  const normalized = normalizeCommandPrefix(messageUpper);

  // Just "CRYPTO" (or "CRYPTO," "CRYPTO!" etc.)
  if (normalized === CRYPTO_PREFIX) {
    return { subcommand: "REPORT" };
  }

  // Extract subcommand after prefix
  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { subcommand: "REPORT" };
  }

  return { subcommand: parts[1] ?? "REPORT" };
}

async function handleReport(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;

  try {
    const latest = await getLatestStoredCryptoReport();

    if (!latest) {
      await sendSmsResponse(
        from,
        "No stored crypto report yet. Text CRYPTO RUN to generate one now.",
        twilioClient
      );
      return true;
    }

    const message = await buildCryptoReportMessage(
      latest.summary,
      latest.date,
      latest.reportPath, // Use report path for viewer
      context.normalizedFrom,
      {
        podcastLink:
          latest.podcast?.shortLink ?? latest.podcast?.audioUrl ?? null,
      }
    );

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error("Failed to fetch latest crypto report:", error);
    await sendSmsResponse(
      from,
      "❌ Could not load the latest crypto report. Try again soon or run CRYPTO RUN.",
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleRun(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;

  if (context.normalizedFrom !== ADMIN_PHONE) {
    await sendSmsResponse(
      from,
      "This command is limited to Bart.",
      twilioClient
    );
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  await sendSmsResponse(
    from,
    "📊 Generating a fresh crypto research report. I'll text you when it's ready.",
    twilioClient
  );

  try {
    const metadata = await runAndStoreCryptoReport({ forcePodcast: true });
    const message = await buildCryptoReportMessage(
      metadata.summary,
      metadata.date,
      metadata.reportPath, // Use report path for viewer
      context.normalizedFrom,
      {
        podcastLink:
          metadata.podcast?.shortLink ?? metadata.podcast?.audioUrl ?? null,
      }
    );

    await sendSmsResponse(from, message, twilioClient);
  } catch (error: any) {
    console.error("Crypto command failed:", error);

    const message = error instanceof Error ? error.message : "";

    if (message.includes("missing_claude_agent_sdk")) {
      await sendSmsResponse(
        from,
        "⚠️ Crypto agent needs setup: run `pip install claude-agent-sdk` and set CLAUDE_CODE_OAUTH_TOKEN on the server.",
        twilioClient
      );
    } else {
      await sendSmsResponse(
        from,
        "❌ Crypto research agent hit a snag. Try again in a bit.",
        twilioClient
      );
    }
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
    "CRYPTO commands:\n• CRYPTO / CRYPTO REPORT – latest daily report\n• CRYPTO SUBSCRIBE – get the daily text\n• CRYPTO UNSUBSCRIBE – stop the daily text\n• CRYPTO HELP – this message\n• CRYPTO RUN – generate a fresh report (Bart only)",
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
      CRYPTO_AGENT_SLUG
    );

    if (alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're already subscribed to the daily crypto report.",
        twilioClient
      );
      return true;
    }

    const result = await subscribeToAgent(
      context.normalizedFrom,
      CRYPTO_AGENT_SLUG
    );

    if (result === "missing_subscriber") {
      await sendSmsResponse(
        from,
        "❌ Could not find your subscriber record. Try texting START first.",
        twilioClient
      );
      return true;
    }

    if (result === "already") {
      await sendSmsResponse(
        from,
        "You're already subscribed to the daily crypto report.",
        twilioClient
      );
      return true;
    }

    if (result === "error") {
      await sendSmsResponse(
        from,
        "❌ Could not update your subscription. Please try again later.",
        twilioClient
      );
      return true;
    }

    const confirmationMessage =
      result === "reactivated"
        ? "📈 Welcome back! Daily crypto summaries will resume tomorrow morning."
        : "📈 You're now subscribed. I'll text you each morning with the crypto summary and link.";

    await sendSmsResponse(from, confirmationMessage, twilioClient);
  } catch (error) {
    console.error("Error subscribing to crypto report:", error);
    await sendSmsResponse(
      from,
      "❌ Could not update your subscription. Please try again later.",
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
      CRYPTO_AGENT_SLUG
    );

    if (!alreadySubscribed) {
      await sendSmsResponse(
        from,
        "You're not currently subscribed to the daily crypto report.",
        twilioClient
      );
      return true;
    }

    const result = await unsubscribeFromAgent(
      context.normalizedFrom,
      CRYPTO_AGENT_SLUG
    );

    if (result === "missing_subscriber") {
      await sendSmsResponse(
        from,
        "❌ Could not find your subscriber record. Try texting START first.",
        twilioClient
      );
      return true;
    }

    if (result === "error") {
      await sendSmsResponse(
        from,
        "❌ Could not update your subscription. Please try again later.",
        twilioClient
      );
      return true;
    }

    await sendSmsResponse(
      from,
      "🛑 You're unsubscribed. Text CRYPTO SUBSCRIBE if you want back in.",
      twilioClient
    );
  } catch (error) {
    console.error("Error unsubscribing from crypto report:", error);
    await sendSmsResponse(
      from,
      "❌ Could not update your subscription. Please try again later.",
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

export const cryptoCommandHandler: CommandHandler = {
  name: "crypto",
  matches(context) {
    // Handle "CRYPTO", "CRYPTO,", "crypto!", etc.
    return matchesPrefix(context.messageUpper, CRYPTO_PREFIX);
  },
  async handle(context) {
    const { subcommand } = parseCryptoCommand(context.messageUpper);

    switch (subcommand) {
      case "HELP":
        return handleHelp(context);
      case "RUN":
        return handleRun(context);
      case "SUBSCRIBE":
        return handleSubscribe(context);
      case "UNSUBSCRIBE":
        return handleUnsubscribe(context);
      case "REPORT":
      default:
        return handleReport(context);
    }
  },
};
