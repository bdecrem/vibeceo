import type { TwilioClient } from './webhooks.js';
import { getAiDailySubscribers, updateAiDailyLastSent } from '../subscribers.js';
import { getLatestAiDailyEpisode, formatAiDailySms } from './ai-daily.js';

const SCHEDULER_INTERVAL_MS = 60 * 1000; // Check every minute
const DEFAULT_SEND_HOUR = Number(process.env.AI_DAILY_SEND_HOUR || 7);
const DEFAULT_SEND_MINUTE = Number(process.env.AI_DAILY_SEND_MINUTE || 0);
const BROADCAST_DELAY_MS = Number(process.env.AI_DAILY_PER_MESSAGE_DELAY_MS || 150);
const FALLBACK_MESSAGE = 'AI Daily is temporarily unavailable. Please try again in a few minutes.';

let lastBroadcastDateKey = '';

function toPacificDate(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
}

function getPacificDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function hasReceivedToday(lastSentAt: string | null | undefined, todayKey: string): boolean {
  if (!lastSentAt) {
    return false;
  }

  const lastSentDate = new Date(lastSentAt);
  const lastSentKey = getPacificDateKey(lastSentDate);
  return lastSentKey === todayKey;
}

async function delay(durationMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, durationMs));
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
        from: fromNumber
      });
      await updateAiDailyLastSent(to);
      await delay(BROADCAST_DELAY_MS);
    } catch (error) {
      console.error(`Failed to send AI Daily episode to ${to}:`, error);
    }
  }
}

export function startAiDailyScheduler(twilioClient: TwilioClient): void {
  console.log('AI Daily scheduler initialized. Checking for deliveries every minute.');

  setInterval(async () => {
    try {
      const now = new Date();
      const pacificNow = toPacificDate(now);
      const targetHour = DEFAULT_SEND_HOUR;
      const targetMinute = DEFAULT_SEND_MINUTE;

      if (pacificNow.getHours() !== targetHour || pacificNow.getMinutes() !== targetMinute) {
        return;
      }

      const todayKey = getPacificDateKey(now);
      if (lastBroadcastDateKey === todayKey) {
        return;
      }

      lastBroadcastDateKey = todayKey;

      const subscribers = await getAiDailySubscribers();
      if (!subscribers.length) {
        console.log('AI Daily scheduler: no subscribed recipients found.');
        return;
      }

      const recipients = subscribers
        .filter(subscriber => !hasReceivedToday(subscriber.ai_daily_last_sent_at, todayKey))
        .map(subscriber => subscriber.phone_number);

      if (!recipients.length) {
        console.log('AI Daily scheduler: all subscribers already received today\'s episode.');
        return;
      }

      let message: string;
      try {
        const episode = await getLatestAiDailyEpisode();
        message = formatAiDailySms(episode);
      } catch (error) {
        console.error('AI Daily scheduler: failed to retrieve latest episode. Sending fallback message.', error);
        message = FALLBACK_MESSAGE;
      }

      console.log(`AI Daily scheduler: sending episode to ${recipients.length} subscriber(s).`);
      await broadcastMessage(twilioClient, recipients, message);
    } catch (error) {
      console.error('AI Daily scheduler loop encountered an error:', error);
    }
  }, SCHEDULER_INTERVAL_MS);
}
