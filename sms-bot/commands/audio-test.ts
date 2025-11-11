import { getLatestAiDailyEpisode, type AiDailyEpisode } from '../lib/sms/ai-daily.js';
import { buildAiDailyMusicPlayerUrl } from '../lib/utils/music-player-link.js';
import { createShortLink } from '../lib/utils/shortlink-service.js';
import type { CommandContext, CommandHandler } from './types.js';
import { matchesPrefix } from './command-utils.js';

const AUDIO_TEST_KEYWORDS = ['AUDIO TEST', 'AUDIO-TEST'];
async function resolvePlayerLink(
  episode: AiDailyEpisode,
  createdFor: string
): Promise<string> {
  const playerUrl = buildAiDailyMusicPlayerUrl(episode);

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
    // Handle "AUDIO TEST", "AUDIO TEST,", "AUDIO-TEST!", etc.
    return AUDIO_TEST_KEYWORDS.some((keyword) => matchesPrefix(trimmed, keyword));
  },
  handle: handleAudioTestCommand,
};
