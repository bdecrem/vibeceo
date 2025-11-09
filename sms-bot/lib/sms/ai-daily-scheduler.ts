import type { TwilioClient } from './webhooks.js';
import { getAiDailySubscribers, updateAiDailyLastSent } from '../subscribers.js';
import { getLatestAiDailyEpisode, formatAiDailySms, getAiDailyShortLink } from './ai-daily.js';
import { registerDailyJob } from '../scheduler/index.js';

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
  message: string
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
  try {
    const episode = await getLatestAiDailyEpisode();
    const shortLink = await getAiDailyShortLink(episode, 'ai_daily_broadcast');
    message = formatAiDailySms(episode, { shortLink });
  } catch (error) {
    console.error('AI Daily scheduler: failed to retrieve latest episode. Sending fallback message.', error);
    message = FALLBACK_MESSAGE;
  }

  console.log(`AI Daily scheduler: sending episode to ${recipients.length} subscriber(s).`);
  await broadcastMessage(twilioClient, recipients, message);
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
