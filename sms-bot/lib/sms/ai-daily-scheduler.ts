import type { TwilioClient } from './webhooks.js';
import { getAiDailySubscribers, updateAiDailyLastSent, getSubscriber } from '../subscribers.js';
import {
  getLatestAiDailyEpisode,
  formatAiDailySms,
  getAiDailyShortLink,
  formatAiDailyLinks,
  generateAndStoreAiResearchDailyReport,
  type AiDailyEpisode
} from './ai-daily.js';
import { registerDailyJob } from '../scheduler/index.js';
import { storeSystemAction } from '../context-loader.js';
import { getLatestReportMetadata } from '../../agents/report-storage.js';
import { buildReportViewerUrl } from '../utils/report-viewer-link.js';
import { createShortLink } from '../utils/shortlink-service.js';

const DEFAULT_SEND_HOUR = Number(process.env.AI_DAILY_SEND_HOUR || 7);
const DEFAULT_SEND_MINUTE = Number(process.env.AI_DAILY_SEND_MINUTE || 0);
const BROADCAST_DELAY_MS = Number(process.env.AI_DAILY_PER_MESSAGE_DELAY_MS || 150);
const FALLBACK_MESSAGE = 'AI Daily is temporarily unavailable. Please try again in a few minutes.';
const pacificDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' });

function hasReceivedToday(lastSentAt: string | null | undefined, todayKey: string): boolean {
  if (!lastSentAt) {
    return false;
  }

  const lastSentDate = new Date(lastSentAt);
  const lastSentKey = pacificDateFormatter.format(lastSentDate);
  return lastSentKey === todayKey;
}

async function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function broadcastMessage(
  twilioClient: TwilioClient,
  toNumbers: string[],
  message: string,
  episode: AiDailyEpisode
): Promise<void> {
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    console.error('Cannot send AI Daily broadcast: TWILIO_PHONE_NUMBER is not configured');
    return;
  }

  for (const to of toNumbers) {
    try {
      await twilioClient.messages.create({
        body: message,
        to,
        from: fromNumber,
      });
      await updateAiDailyLastSent(to);

      // Store AI Daily content in conversation context
      try {
        const subscriber = await getSubscriber(to);
        if (subscriber) {
          // Build full content including links
          const links = formatAiDailyLinks(episode);
          const fullContent = links ? `${message}\n\n${links}` : message;

          await storeSystemAction(subscriber.id, {
            type: 'ai_daily_sent',
            content: fullContent,
            metadata: {
              episode_id: episode.episodeId,
              published_at: episode.publishedAt,
              title: episode.title,
            },
          });

          console.log(`[AI Daily] Stored content in context for ${to}`);
        }
      } catch (contextError) {
        console.error(`[AI Daily] Failed to store context for ${to}:`, contextError);
        // Don't fail the broadcast if context storage fails
      }

      await delay(BROADCAST_DELAY_MS);
    } catch (error) {
      console.error(`Failed to send AI Daily episode to ${to}:`, error);
    }
  }
}

async function runAiDailyBroadcast(twilioClient: TwilioClient): Promise<void> {
  const now = new Date();
  const todayKey = pacificDateFormatter.format(now);

  const subscribers = await getAiDailySubscribers();
  if (!subscribers.length) {
    console.log('AI Daily scheduler: no subscribed recipients found.');
    return;
  }

  const recipients = subscribers
    .filter((subscriber) => !hasReceivedToday(subscriber.ai_daily_last_sent_at, todayKey))
    .map((subscriber) => subscriber.phone_number);

  if (!recipients.length) {
    console.log("AI Daily scheduler: all subscribers already received today's episode.");
    return;
  }

  let message: string;
  let episode: AiDailyEpisode | null = null;

  try {
    // 1. Fetch AI Daily episode
    episode = await getLatestAiDailyEpisode();

    // 2. Get podcast shortlink
    const podcastShortLink = await getAiDailyShortLink(episode, 'ai_daily_broadcast');

    // 3. Generate combined AI Research Daily report (includes arXiv report)
    console.log('Generating AI Research Daily combined report...');
    await generateAndStoreAiResearchDailyReport();
    console.log('AI Research Daily report generated successfully');

    // 4. Get report metadata
    const reportMetadata = await getLatestReportMetadata('ai-research-daily');

    let reportShortLink: string | null = null;
    if (reportMetadata) {
      // 5. Build viewer URL and create shortlink for the report
      const viewerUrl = buildReportViewerUrl({ path: reportMetadata.reportPath });
      reportShortLink = await createShortLink(viewerUrl, {
        context: 'ai-research-daily-report',
        createdFor: 'ai_daily_broadcast',
        createdBy: 'sms-bot'
      });
      console.log(`AI Research Daily report link: ${reportShortLink || viewerUrl}`);
    } else {
      console.warn('Could not retrieve AI Research Daily report metadata for shortlink');
    }

    // 6. Format SMS with both podcast and report links
    message = formatAiDailySms(episode, {
      shortLink: podcastShortLink ?? undefined,
      reportLink: reportShortLink ?? undefined
    });
  } catch (error) {
    console.error('AI Daily scheduler: failed to retrieve latest episode. Sending fallback message.', error);
    message = FALLBACK_MESSAGE;
  }

  console.log(`AI Daily scheduler: sending episode to ${recipients.length} subscriber(s).`);
  await broadcastMessage(twilioClient, recipients, message, episode!);
}

export function registerAiDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'ai-daily-broadcast',
    hour: DEFAULT_SEND_HOUR,
    minute: DEFAULT_SEND_MINUTE,
    timezone: 'America/Los_Angeles',
    run: () => runAiDailyBroadcast(twilioClient),
  });
}

