/**
 * Amber Explain (amberx) Command
 *
 * Explains content from Twitter/YouTube URLs with:
 * - Short SMS summary (fits in single message)
 * - Full markdown report (stored in Supabase)
 * - Audio explanation with interactive mode (Realtime API)
 *
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
import { getVoiceProvider, type VoiceProvider } from '../lib/voice/index.js';
import { createShortLink } from '../lib/utils/shortlink-service.js';
import { buildMusicPlayerUrl } from '../lib/utils/music-player-link.js';
import { buildReportViewerUrl } from '../lib/utils/report-viewer-link.js';
import { storeAgentReport } from '../agents/report-storage.js';

// Voice provider configuration - defaults to Hume
const AMBERX_VOICE_PROVIDER = (process.env.AMBERX_VOICE_PROVIDER || 'hume') as 'hume' | 'elevenlabs';
const AMBERX_HUME_VOICE_ID = process.env.AMBERX_HUME_VOICE_ID || '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';
const AMBERX_ELEVENLABS_VOICE_ID = process.env.AMBERX_ELEVENLABS_VOICE_ID || 'MF3mGyEYCl7XYWbV9V6O';

// Initialize voice provider based on config
let voiceProvider: VoiceProvider | null = null;
function getAmberxVoiceProvider(): VoiceProvider | null {
  if (voiceProvider) return voiceProvider;

  if (AMBERX_VOICE_PROVIDER === 'hume') {
    if (!process.env.HUME_API_KEY) {
      console.log('[amberx] Hume API key not configured');
      return null;
    }
    voiceProvider = getVoiceProvider('hume', { voiceId: AMBERX_HUME_VOICE_ID });
  } else {
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log('[amberx] ElevenLabs API key not configured');
      return null;
    }
    voiceProvider = getVoiceProvider('elevenlabs', { voiceId: AMBERX_ELEVENLABS_VOICE_ID });
  }

  return voiceProvider;
}

// URL patterns to detect
const URL_PATTERN = /https?:\/\/[^\s]+/i;

// Session storage for follow-ups (keyed by phone number)
interface AmberxSession {
  content: FetchedContent;
  lastResult: ExplainerResult;
  timestamp: number;
  subscriberId: string;
  contentId?: string; // UUID in covered_content table
}

const sessions = new Map<string, AmberxSession>();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const AUDIO_BUCKET = 'audio';
const AGENT_SLUG = 'amberx';

/**
 * Store content in covered_content table for interactive mode
 */
async function storeContentForInteractive(
  result: ExplainerResult,
  content: FetchedContent,
  audioUrl: string | null,
  reportPath: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('covered_content')
      .insert({
        content_type: result.contentType,
        external_id: result.externalId,
        title: result.title,
        author: result.author,
        summary: result.shortSummary,
        full_text: result.rawContent,
        url: content.url,
        metadata: {
          full_explanation: result.fullExplanation,
          key_points: result.keyPoints,
          audio_url: audioUrl,
          report_path: reportPath,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[amberx] Failed to store content:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('[amberx] Error storing content:', error);
    return null;
  }
}

/**
 * Store full explanation as markdown report
 */
async function storeExplanationReport(
  result: ExplainerResult,
  content: FetchedContent
): Promise<{ reportPath: string; reportUrl: string } | null> {
  try {
    // Use date + external_id to create unique report per content
    const dateStr = new Date().toISOString().split('T')[0];
    const uniqueDate = `${dateStr}-${result.externalId.slice(0, 8)}`;

    // Build markdown report
    const markdown = `# ${result.title}

**Source:** ${content.url}
**Author:** ${result.author || 'Unknown'}
**Explained:** ${new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

---

${result.fullExplanation}

---

*Explained by Amber via Kochi.to*
`;

    const stored = await storeAgentReport({
      agent: AGENT_SLUG,
      date: uniqueDate,
      markdown,
      summary: result.shortSummary,
    });

    const viewerUrl = buildReportViewerUrl({ path: stored.reportPath });

    return {
      reportPath: stored.reportPath,
      reportUrl: viewerUrl,
    };
  } catch (error) {
    console.error('[amberx] Failed to store report:', error);
    return null;
  }
}

/**
 * Generate audio explanation and upload to storage
 * Returns both the raw audio URL and a player shortlink
 */
async function generateAudioExplanation(
  explanation: string,
  contentType: string,
  externalId: string,
  title: string,
  contentId: string | null
): Promise<{ audioUrl: string; playerLink: string } | null> {
  const provider = getAmberxVoiceProvider();
  if (!provider) {
    console.log('[amberx] Skipping audio - no voice provider configured');
    return null;
  }

  try {
    console.log(`[amberx] Generating audio with ${AMBERX_VOICE_PROVIDER}...`);

    // Synthesize audio with appropriate options
    const synthesizeOptions = AMBERX_VOICE_PROVIDER === 'hume'
      ? { description: 'Speak clearly and engagingly, like a friendly explainer' }
      : {};

    const audioResult = await provider.synthesize(explanation, synthesizeOptions);

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

    // Create player URL with content_id for interactive mode
    const playerUrl = buildMusicPlayerUrl({
      src: audioUrl,
      title: `Amberx — ${title}`,
      description: 'Ask follow-up questions after listening',
      autoplay: true,
    });

    // Add amberx_id param for interactive mode
    const playerUrlWithContext = contentId
      ? `${playerUrl}&amberx_id=${contentId}`
      : playerUrl;

    const shortLink = await createShortLink(playerUrlWithContext, {
      context: 'amberx-audio',
      createdBy: 'sms-bot',
    });

    return {
      audioUrl,
      playerLink: shortLink || playerUrl,
    };
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

    await sendSmsResponse(from, `Analyzing ${contentType} content...`, twilioClient);

    // Get subscriber ID for preferences
    const userContext = await loadUserContext(normalizedFrom);
    const subscriberId = userContext?.subscriberId || normalizedFrom;

    try {
      // Fetch content first
      const content = await fetchContent(url);

      // Generate both short and full explanations
      const result = await explainContent({
        url,
        subscriberId,
      });

      // Store markdown report
      const reportResult = await storeExplanationReport(result, content);
      const reportPath = reportResult?.reportPath || null;

      // Store content for interactive mode (before audio so we have contentId)
      const contentId = await storeContentForInteractive(
        result,
        content,
        null, // audio URL added later
        reportPath
      );

      // Generate audio (uses contentId for interactive mode link)
      const audioResult = await generateAudioExplanation(
        result.fullExplanation,
        result.contentType,
        result.externalId,
        result.title,
        contentId
      );

      // Update covered_content with audio URL if generated
      if (contentId && audioResult?.audioUrl) {
        await supabase
          .from('covered_content')
          .update({
            metadata: {
              full_explanation: result.fullExplanation,
              key_points: result.keyPoints,
              audio_url: audioResult.audioUrl,
              report_path: reportPath,
            },
          })
          .eq('id', contentId);
      }

      // Store session for follow-ups
      sessions.set(from, {
        content,
        lastResult: result,
        timestamp: Date.now(),
        subscriberId,
        contentId: contentId || undefined,
      });

      // Store thread state for orchestrated routing
      await storeThreadState(subscriberId, {
        handler: 'amberx-session',
        topic: result.title,
        context: {
          url,
          contentType: result.contentType,
          externalId: result.externalId,
          contentId,
        },
      });

      // Build short SMS response (must fit in single message)
      const icon = result.contentType === 'youtube' ? '📺' : '🐦';
      const titleLine = result.title.length > 50
        ? result.title.slice(0, 47) + '...'
        : result.title;

      const lines: string[] = [
        `${icon} ${titleLine}`,
        result.shortSummary,
      ];

      // Create shortlinks for report and audio
      if (reportResult?.reportUrl) {
        const reportLink = await createShortLink(reportResult.reportUrl, {
          context: 'amberx-report',
          createdBy: 'sms-bot',
        });
        lines.push(`📄 ${reportLink} — full breakdown`);
      }

      if (audioResult?.playerLink) {
        lines.push(`🎧 ${audioResult.playerLink} — listen + ask questions`);
      }

      const response = lines.join('\n');
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
