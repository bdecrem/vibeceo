import { getLatestAiDailyEpisode, type AiDailyEpisode } from '../lib/sms/ai-daily.js';
import { createShortLink } from '../lib/utils/shortlink-service.js';
import type { CommandContext, CommandHandler } from './types.js';

const AUDIO_TEST_KEYWORDS = ['AUDIO TEST', 'AUDIO-TEST'];
const PLAYER_BASE_FALLBACK = 'https://b52s.me';

function buildMusicPlayerUrl(episode: AiDailyEpisode): string {
  const baseUrl = (process.env.SHORTLINK_BASE_URL || PLAYER_BASE_FALLBACK).replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('src', episode.audioUrl);

  const publishedDate = episode.publishedAt ? new Date(episode.publishedAt) : new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
  });
  const formattedDate = formatter.format(
    Number.isNaN(publishedDate.getTime()) ? new Date() : publishedDate
  );

  const title = episode.title?.trim() || `AI Daily ${formattedDate}`;
  params.set('title', title);

  const snippet = episode.snippet?.trim();
  if (snippet) {
    const clipped = snippet.length > 160 ? `${snippet.slice(0, 157).trim()}…` : snippet;
    params.set('description', clipped);
  }

  params.set('autoplay', '1');

  return `${baseUrl}/music-player?${params.toString()}`;
}

async function resolvePlayerLink(
  episode: AiDailyEpisode,
  createdFor: string
): Promise<string> {
  const playerUrl = buildMusicPlayerUrl(episode);

  try {
    const shortLink = await createShortLink(playerUrl, {
      context: 'ai-daily-player',
      createdBy: 'sms-bot',
      createdFor,
    });

    return shortLink ?? playerUrl;
  } catch (error) {
    console.warn('Failed to create player short link:', error);
    return playerUrl;
  }
}

async function handleAudioTestCommand(context: CommandContext): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const episode = await getLatestAiDailyEpisode();

    if (!episode.audioUrl) {
      await sendSmsResponse(
        from,
        'Audio test is unavailable: latest AI Daily episode does not include an audio file.',
        twilioClient
      );
      return true;
    }

    const link = await resolvePlayerLink(episode, normalizedFrom);
    const message = `Audio test: ${link}`;

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Audio test command failed:', error);
    await sendSmsResponse(
      from,
      'Audio test ran into an error fetching the latest AI Daily episode. Try again soon.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }

  return true;
}

export const audioTestCommandHandler: CommandHandler = {
  name: 'audio-test',
  matches(context) {
    const trimmed = context.messageUpper.trim();
    return AUDIO_TEST_KEYWORDS.some((keyword) => trimmed.startsWith(keyword));
  },
  handle: handleAudioTestCommand,
};
