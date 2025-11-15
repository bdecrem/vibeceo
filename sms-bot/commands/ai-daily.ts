import {
  getLatestAiDailyEpisode,
  formatAiDailySms,
  getAiDailyShortLink,
  generateAndStoreAiResearchDailyReport,
} from "../lib/sms/ai-daily.js";
import { getLatestReportMetadata } from "../agents/report-storage.js";
import { buildReportViewerUrl } from "../lib/utils/report-viewer-link.js";
import { createShortLink } from "../lib/utils/shortlink-service.js";
import type { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix, normalizeCommandPrefix } from "./command-utils.js";

const AI_DAILY_PREFIX = "AI DAILY";
const ADMIN_PHONE = "+16508989508";

function parseAiDailyCommand(messageUpper: string): { subcommand: string } {
  const normalized = normalizeCommandPrefix(messageUpper);

  // Just "AI DAILY"
  if (normalized === AI_DAILY_PREFIX) {
    return { subcommand: "GET" };
  }

  // Extract subcommand
  const afterPrefix = normalized.substring(AI_DAILY_PREFIX.length).trim();
  const parts = afterPrefix.split(/\s+/);

  return { subcommand: parts[0] || "GET" };
}

async function handleRun(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

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
    "🎙️ Generating AI Research Daily report. I'll text you when it's ready.",
    twilioClient
  );

  try {
    // 1. Fetch AI Daily episode
    const episode = await getLatestAiDailyEpisode();

    // 2. Get podcast shortlink
    const podcastShortLink = await getAiDailyShortLink(episode, context.normalizedFrom);

    // 3. Generate combined AI Research Daily report
    await generateAndStoreAiResearchDailyReport();

    // 4. Get report metadata
    const reportMetadata = await getLatestReportMetadata('ai-research-daily');

    let reportShortLink: string | null = null;
    if (reportMetadata) {
      // 5. Build viewer URL and create shortlink
      const viewerUrl = buildReportViewerUrl({ path: reportMetadata.reportPath });
      reportShortLink = await createShortLink(viewerUrl, {
        context: 'ai-research-daily-report',
        createdFor: context.normalizedFrom,
        createdBy: 'sms-bot'
      });
    }

    // 6. Format SMS message
    const message = formatAiDailySms(episode, {
      shortLink: podcastShortLink ?? undefined,
      reportLink: reportShortLink ?? undefined
    });

    await sendSmsResponse(from, message, twilioClient);

  } catch (error: any) {
    console.error("AI DAILY RUN failed:", error);

    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("404") || errorMessage.includes("AI Daily fetch failed")) {
      await sendSmsResponse(
        from,
        "❌ AI Daily service is unavailable (theaf-web may be down). The podcast endpoint returned 404.",
        twilioClient
      );
    } else {
      await sendSmsResponse(
        from,
        "❌ AI Research Daily generation failed. Check logs for details.",
        twilioClient
      );
    }
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

export const aiDailyCommandHandler: CommandHandler = {
  name: "ai-daily",
  matches(context) {
    // Check if message starts with "AI DAILY" followed by space or end
    const normalized = normalizeCommandPrefix(context.messageUpper);
    return normalized === AI_DAILY_PREFIX || normalized.startsWith(AI_DAILY_PREFIX + " ");
  },
  async handle(context) {
    const { subcommand } = parseAiDailyCommand(context.messageUpper);

    if (subcommand === "RUN") {
      return handleRun(context);
    }

    // Let existing handlers (in handlers.ts) handle other AI DAILY commands
    return false;
  },
};
