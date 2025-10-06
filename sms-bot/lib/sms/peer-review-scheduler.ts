import type { TwilioClient } from './webhooks.js';
import { getAgentSubscribers, markAgentReportSent } from '../agent-subscriptions.js';
import { registerDailyJob } from '../scheduler/index.js';
import {
  getLatestPeerReviewEpisode,
  getPeerReviewShortLink,
  formatPeerReviewSms,
} from '../crash/peer-review.js';

const PEER_REVIEW_AGENT_SLUG = 'peer-review-fight-club';
const DEFAULT_SEND_HOUR = Number(process.env.PEER_REVIEW_SEND_HOUR || 7);
const DEFAULT_SEND_MINUTE = Number(process.env.PEER_REVIEW_SEND_MINUTE || 15);
const BROADCAST_DELAY_MS = Number(process.env.PEER_REVIEW_PER_MESSAGE_DELAY_MS || 150);
const FALLBACK_MESSAGE =
  'Peer Review Fight Club is temporarily unavailable. Please try again in a few minutes.';

function toPacificDate(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
}

function hasReceivedToday(lastSentAt: string | null | undefined, todayKey: string): boolean {
  if (!lastSentAt) {
    return false;
  }

  const lastSentDate = new Date(lastSentAt);
  if (Number.isNaN(lastSentDate.getTime())) {
    return false;
  }

  const lastSentKey = lastSentDate.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });

  return lastSentKey === todayKey;
}

async function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function broadcastMessage(
  twilioClient: TwilioClient,
  recipients: Array<{ phoneNumber: string; normalized: string }>,
  message: string
): Promise<void> {
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    console.error(
      'Cannot send Peer Review broadcast: TWILIO_PHONE_NUMBER is not configured'
    );
    return;
  }

  for (const recipient of recipients) {
    try {
      await twilioClient.messages.create({
        body: message,
        to: recipient.phoneNumber,
        from: fromNumber,
      });
      await markAgentReportSent(recipient.normalized, PEER_REVIEW_AGENT_SLUG);
      await delay(BROADCAST_DELAY_MS);
    } catch (error) {
      console.error(`Failed to send Peer Review episode to ${recipient.phoneNumber}:`, error);
    }
  }
}

async function runPeerReviewBroadcast(twilioClient: TwilioClient): Promise<void> {
  const now = new Date();
  const pacificNow = toPacificDate(now);
  const todayKey = pacificNow.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });

  const subscribers = await getAgentSubscribers(PEER_REVIEW_AGENT_SLUG);
  if (!subscribers.length) {
    console.log('Peer Review scheduler: no active subscribers.');
    return;
  }

  const recipients = subscribers
    .filter((subscriber) => !hasReceivedToday(subscriber.last_sent_at, todayKey))
    .map((subscriber) => ({
      phoneNumber: subscriber.phone_number,
      normalized: subscriber.phone_number,
    }));

  if (!recipients.length) {
    console.log('Peer Review scheduler: all subscribers already received today\'s episode.');
    return;
  }

  let message: string;
  try {
    const episode = await getLatestPeerReviewEpisode();
    const playerLink = await getPeerReviewShortLink(episode, 'peer_review_broadcast');
    message = formatPeerReviewSms(episode, {
      shortLink: playerLink ?? undefined,
    });
  } catch (error) {
    console.error('Peer Review scheduler: failed to retrieve latest episode. Sending fallback message.', error);
    message = FALLBACK_MESSAGE;
  }

  console.log(`Peer Review scheduler: sending episode to ${recipients.length} subscriber(s).`);
  await broadcastMessage(twilioClient, recipients, message);
}

export function registerPeerReviewJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'peer-review-broadcast',
    hour: DEFAULT_SEND_HOUR,
    minute: DEFAULT_SEND_MINUTE,
    timezone: 'America/Los_Angeles',
    run: () => runPeerReviewBroadcast(twilioClient),
  });
}
