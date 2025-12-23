/**
 * Amber Explain (amberx) Command
 *
 * Explains content from Twitter/YouTube URLs with follow-up support.
 * Usage: amberx <url> | amber <url> | explain <url>
 */

import type { CommandContext, CommandHandler } from './types.js';
import type { ActiveThread } from '../lib/context-loader.js';
import { storeThreadState, clearThreadState, loadUserContext } from '../lib/context-loader.js';
import {
  explainContent,
  fetchContent,
  detectContentType,
  type ExplainerResult,
  type FetchedContent,
} from '../lib/content-explainer/index.js';
import { supabase } from '../lib/supabase.js';
import ElevenLabsProvider from '../agents/crypto-research/ElevenLabsProvider.js';
import { createShortLink } from '../lib/utils/shortlink-service.js';
import { buildMusicPlayerUrl } from '../lib/utils/music-player-link.js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const elevenLabsProvider = new ElevenLabsProvider({
  apiKey: ELEVENLABS_API_KEY,
  defaultVoice: 'MF3mGyEYCl7XYWbV9V6O',
});

// URL patterns to detect
const URL_PATTERN = /https?:\/\/[^\s]+/i;

// Session storage for follow-ups (keyed by phone number)
interface AmberxSession {
  content: FetchedContent;
  lastResult: ExplainerResult;
  timestamp: number;
  subscriberId: string;
}

const sessions = new Map<string, AmberxSession>();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const AUDIO_BUCKET = 'audio';

/**
 * Generate audio explanation and return player link
 */
async function generateAudioExplanation(
  explanation: string,
  contentType: string,
  externalId: string
): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
    console.log('[amberx] Skipping audio - no ELEVENLABS_API_KEY');
    return null;
  }

  try {
    // Synthesize audio
    const audioResult = await elevenLabsProvider.synthesize(explanation);

    // Upload to storage
    const timestamp = Date.now();
    const fileName = `amberx/${contentType}-${externalId}-${timestamp}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(fileName, audioResult.audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('[amberx] Audio upload failed:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(AUDIO_BUCKET)
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // Create player shortlink
    const playerUrl = buildMusicPlayerUrl({
      src: audioUrl,
      title: `Amberx Explanation`,
      autoplay: true,
    });

    const shortLink = await createShortLink(playerUrl, {
      context: 'amberx',
      createdBy: 'sms-bot',
    });

    return shortLink || audioUrl;
  } catch (error) {
    console.error('[amberx] Audio generation failed:', error);
    return null;
  }
}

/**
 * Clean up expired sessions (call periodically)
 */
export function cleanupSessions(): void {
  const now = Date.now();
  for (const [phone, session] of sessions) {
    if (now - session.timestamp > SESSION_TIMEOUT_MS) {
      sessions.delete(phone);
    }
  }
}

export const amberxCommandHandler: CommandHandler = {
  name: 'amberx',

  matches(context: CommandContext): boolean {
    const normalized = context.messageUpper.trim();

    // Match command prefixes
    const prefixes = ['AMBERX', 'AMBER', 'EXPLAIN'];
    const hasPrefix = prefixes.some(
      (p) => normalized.startsWith(p + ' ') || normalized === p
    );

    if (!hasPrefix) return false;

    return true;
  },

  async handle(context: CommandContext): Promise<boolean> {
    const { message, from, normalizedFrom, twilioClient, sendSmsResponse, sendChunkedSmsResponse, updateLastMessageDate } = context;
    const normalized = message.toLowerCase().trim();

    // Helper to send response
    const reply = async (msg: string) => {
      await sendChunkedSmsResponse(from, msg, twilioClient);
      await updateLastMessageDate(normalizedFrom);
    };

    // Help text if no URL provided
    if (normalized === 'amberx' || normalized === 'amber' || normalized === 'explain') {
      await reply(
        `Amber Explain\n\n` +
          `Send me a URL and I'll explain it:\n` +
          `- YouTube videos (with transcript)\n` +
          `- Twitter/X posts\n\n` +
          `Example:\namberx https://youtube.com/watch?v=...\n\n` +
          `After I explain, just reply with follow-up questions!`
      );
      return true;
    }

    // Extract URL from message
    const urlMatch = message.match(URL_PATTERN);
    if (!urlMatch) {
      await reply(
        `I need a URL to explain. Try:\namberx https://youtube.com/watch?v=...`
      );
      return true;
    }

    const url = urlMatch[0];

    // Check if URL type is supported
    const contentType = detectContentType(url);
    if (!contentType) {
      await reply(
        `I can't explain that URL yet.\n\n` +
          `Supported:\n` +
          `- YouTube (youtube.com, youtu.be)\n` +
          `- Twitter/X (twitter.com, x.com)`
      );
      return true;
    }

    await sendSmsResponse(from, `Fetching ${contentType} content...`, twilioClient);

    // Get subscriber ID for preferences
    const userContext = await loadUserContext(normalizedFrom);
    const subscriberId = userContext?.subscriberId || normalizedFrom;

    try {
      // Fetch and explain the content
      const result = await explainContent({
        url,
        subscriberId,
      });

      // Store session for follow-ups
      const content = await fetchContent(url);
      sessions.set(from, {
        content,
        lastResult: result,
        timestamp: Date.now(),
        subscriberId,
      });

      // Store thread state for orchestrated routing
      await storeThreadState(subscriberId, {
        handler: 'amberx-session',
        topic: result.title,
        context: {
          url,
          contentType: result.contentType,
          externalId: result.externalId,
        },
      });

      // Generate audio in parallel
      await sendSmsResponse(from, `Generating audio...`, twilioClient);
      const audioLink = await generateAudioExplanation(
        result.explanation,
        result.contentType,
        result.externalId
      );

      // Format response
      const sourceLabel =
        result.contentType === 'youtube'
          ? `${result.title}`
          : `@${result.author}`;

      let response =
        `${sourceLabel}\n\n` +
        `${result.explanation}\n\n`;

      if (audioLink) {
        response += `Listen: ${audioLink}\n\n`;
      }

      response += `Reply with any questions!`;

      await reply(response);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Clear any partial session
      sessions.delete(from);
      if (subscriberId !== normalizedFrom) {
        await clearThreadState(subscriberId);
      }

      await reply(`Error: ${errorMessage}`);
      return true;
    }
  },
};

/**
 * Handle follow-up questions in an active amberx session
 * Called from orchestrated-routing.ts
 */
export async function handleFollowUp(
  ctx: CommandContext,
  thread: ActiveThread
): Promise<boolean> {
  const { message, from, normalizedFrom, twilioClient, sendSmsResponse, sendChunkedSmsResponse, updateLastMessageDate } = ctx;

  // Helper to send response
  const reply = async (msg: string) => {
    await sendChunkedSmsResponse(from, msg, twilioClient);
    await updateLastMessageDate(normalizedFrom);
  };

  // Get stored session
  const session = sessions.get(from);

  // Check if session expired or missing
  if (!session || Date.now() - session.timestamp > SESSION_TIMEOUT_MS) {
    sessions.delete(from);
    await clearThreadState(session?.subscriberId || normalizedFrom);
    return false; // Let other handlers try
  }

  // Update session timestamp
  session.timestamp = Date.now();

  // Check for exit commands
  const normalized = message.toLowerCase().trim();
  if (['done', 'exit', 'quit', 'stop', 'thanks', 'thank you'].includes(normalized)) {
    sessions.delete(from);
    await clearThreadState(session.subscriberId);
    await reply(`Session ended. Send another URL anytime!`);
    return true;
  }

  await sendSmsResponse(from, `Let me think about that...`, twilioClient);

  try {
    // Generate follow-up explanation using stored content
    const result = await explainContent({
      url: session.content.url,
      subscriberId: session.subscriberId,
      followUpQuestion: message,
    });

    // Update session with new result
    session.lastResult = result;

    await reply(`${result.explanation}\n\nAny other questions?`);
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    await reply(`Error: ${errorMessage}`);
    return true;
  }
}
