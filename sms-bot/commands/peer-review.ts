import {
  getLatestPeerReviewEpisode,
  formatPeerReviewSms,
  getPeerReviewShortLink,
  formatPeerReviewLinks,
} from '../lib/crash/peer-review.js';
import {
  subscribeToAgent,
  unsubscribeFromAgent,
  markAgentReportSent,
} from '../lib/agent-subscriptions.js';
import type { CommandContext, CommandHandler } from './types.js';
import { matchesPrefix, normalizeCommandPrefix } from './command-utils.js';

const PEER_REVIEW_COMMAND_PREFIX = 'PEER REVIEW';
const PEER_REVIEW_AGENT_SLUG = 'peer-review-fight-club';
const PEER_REVIEW_FALLBACK_MESSAGE =
  'Peer Review Fight Club is temporarily unavailable. Please try again soon.';

type SubscribeResult = Awaited<ReturnType<typeof subscribeToAgent>>;
type UnsubscribeResult = Awaited<ReturnType<typeof unsubscribeFromAgent>>;

function normalizePeerReviewCommand(messageUpper: string): string {
  // First normalize punctuation, then convert hyphens to spaces
  const withoutPunctuation = normalizeCommandPrefix(messageUpper);
  return withoutPunctuation.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

async function deliverPeerReviewEpisode(
  context: CommandContext,
  options: { prefix?: string; recordDelivery?: boolean; createdFor?: string } = {}
): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const episode = await getLatestPeerReviewEpisode();
    const playerLink = await getPeerReviewShortLink(
      episode,
      options.createdFor || normalizedFrom
    );
    const messageBody = formatPeerReviewSms(episode, {
      shortLink: playerLink ?? undefined,
    });

    const responseMessage = options.prefix
      ? `${options.prefix}\n\n${messageBody}`
      : messageBody;

    await sendSmsResponse(from, responseMessage, twilioClient);

    if (options.recordDelivery) {
      await markAgentReportSent(normalizedFrom, PEER_REVIEW_AGENT_SLUG);
    }
  } catch (error) {
    console.error('Peer Review delivery failed:', error);
    const responseMessage = options.prefix
      ? `${options.prefix}\n\n${PEER_REVIEW_FALLBACK_MESSAGE}`
      : PEER_REVIEW_FALLBACK_MESSAGE;
    await sendSmsResponse(from, responseMessage, twilioClient);
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }
}

async function handleLinks(context: CommandContext): Promise<void> {
  const { from, twilioClient, sendChunkedSmsResponse, sendSmsResponse, normalizedFrom, updateLastMessageDate } =
    context;

  try {
    console.log('[PR LINKS] Fetching latest episode...');
    const episode = await getLatestPeerReviewEpisode();
    console.log('[PR LINKS] Episode fetched:', episode.episodeId, episode.title);

    const linksMessage = formatPeerReviewLinks(episode);
    console.log('[PR LINKS] Formatted message:', linksMessage ? linksMessage.substring(0, 100) : 'NULL');

    if (linksMessage) {
      console.log('[PR LINKS] Sending chunked SMS...');
      await sendChunkedSmsResponse(from, linksMessage, twilioClient);
      console.log('[PR LINKS] SMS sent successfully');
    } else {
      console.log('[PR LINKS] No links found, sending fallback message');
      await sendSmsResponse(
        from,
        "No source links are available for today's Peer Review Fight Club episode. Text 'PEER REVIEW' to get the latest summary.",
        twilioClient
      );
    }
  } catch (error) {
    console.error('[PR LINKS] Command failed:', error);
    await sendSmsResponse(from, PEER_REVIEW_FALLBACK_MESSAGE, twilioClient);
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }
}

async function handleSubscribe(
  context: CommandContext,
  result: SubscribeResult
): Promise<void> {
  const { from, twilioClient, normalizedFrom, updateLastMessageDate, sendSmsResponse } =
    context;

  if (result === 'missing_subscriber') {
    await sendSmsResponse(
      from,
      'Text START to join The Foundry first, then send PEER REVIEW SUBSCRIBE.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  if (result === 'already') {
    await sendSmsResponse(
      from,
      "You're already subscribed to Peer Review Fight Club. Text PEER REVIEW for today's episode or PEER REVIEW STOP to opt out.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  if (result === 'error') {
    await sendSmsResponse(
      from,
      'We could not update your Peer Review subscription. Please try again later.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefix =
    result === 'reactivated'
      ? '✅ Welcome back! Peer Review Fight Club will resume texting you the latest episode each morning.'
      : "✅ You're now subscribed to Peer Review Fight Club. Expect the daily text soon.";

  await deliverPeerReviewEpisode(context, {
    prefix,
    recordDelivery: true,
    createdFor: 'peer_review_subscribe',
  });
}

async function handleUnsubscribe(
  context: CommandContext,
  result: UnsubscribeResult
): Promise<void> {
  const { from, twilioClient, normalizedFrom, updateLastMessageDate, sendSmsResponse } =
    context;

  if (result === 'missing_subscriber' || result === 'not_subscribed') {
    await sendSmsResponse(
      from,
      "You're not currently subscribed to Peer Review Fight Club. Text PEER REVIEW SUBSCRIBE to opt in.",
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  if (result === 'error') {
    await sendSmsResponse(
      from,
      'We could not update your Peer Review settings. Please try again later.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  await sendSmsResponse(
    from,
    '✅ You will no longer receive Peer Review Fight Club texts. Text PEER REVIEW SUBSCRIBE if you change your mind.',
    twilioClient
  );
  await updateLastMessageDate(normalizedFrom);
}

export const peerReviewCommandHandler: CommandHandler = {
  name: 'peer-review',
  matches(context: CommandContext): boolean {
    const normalized = normalizePeerReviewCommand(context.messageUpper);
    if (matchesPrefix(normalized, 'PR LINKS')) {
      return true;
    }

    // Handle "PEER REVIEW", "PEER-REVIEW", "PEER REVIEW,", etc.
    return matchesPrefix(normalized, PEER_REVIEW_COMMAND_PREFIX);
  },
  async handle(context: CommandContext): Promise<boolean> {
    const normalized = normalizePeerReviewCommand(context.messageUpper);

    if (normalized === 'PR LINKS') {
      await handleLinks(context);
      return true;
    }

    const parts = normalized.split(' ');
    const subcommand = parts.length > 2 ? parts[2] : parts.length > 1 ? parts[1] : 'LISTEN';

    switch (subcommand) {
      case 'SUBSCRIBE': {
        const result = await subscribeToAgent(
          context.normalizedFrom,
          PEER_REVIEW_AGENT_SLUG
        );
        await handleSubscribe(context, result);
        return true;
      }
      case 'STOP':
      case 'UNSUBSCRIBE': {
        const result = await unsubscribeFromAgent(
          context.normalizedFrom,
          PEER_REVIEW_AGENT_SLUG
        );
        await handleUnsubscribe(context, result);
        return true;
      }
      case 'LINKS': {
        await handleLinks(context);
        return true;
      }
      case 'HELP': {
        await context.sendSmsResponse(
          context.from,
          'Peer Review Fight Club commands:\n• PEER REVIEW – Latest episode link\n• PEER REVIEW LINKS / PR LINKS – Story links\n• PEER REVIEW SUBSCRIBE – Daily text\n• PEER REVIEW STOP – Unsubscribe',
          context.twilioClient
        );
        await context.updateLastMessageDate(context.normalizedFrom);
        return true;
      }
      default: {
        await deliverPeerReviewEpisode(context, {
          recordDelivery: false,
          createdFor: 'peer_review_on_demand',
        });
        return true;
      }
    }
  },
};
