/**
 * AI Twitter Daily Agent
 *
 * Daily agent that monitors curated AI Twitter accounts, analyzes discussions,
 * generates a report and podcast, and broadcasts to subscribers.
 */

import { supabase } from '../../lib/supabase.js';
import { storeAgentReport, getLatestReportMetadata, type StoredReportMetadata } from '../report-storage.js';
import { createShortLink, normalizeShortLinkDomain } from '../../lib/utils/shortlink-service.js';
import { buildMusicPlayerUrl } from '../../lib/utils/music-player-link.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { getAgentSubscribers, markAgentReportSent } from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';
import { v5 as uuidv5 } from 'uuid';
import OpenAI from 'openai';
import { getVoiceProvider } from '../../lib/voice/index.js';
import { fetchAITwitterContent, filterRecentTweets, type FetchedTweet } from './twitter-fetcher.js';
import { analyzeTweets, generateMarkdownReport, generateSmsSummary, type AnalysisResult } from './content-analyzer.js';

// Constants
const AGENT_SLUG = 'ai-twitter-daily';
const TOPIC_NAMESPACE = uuidv5.URL;

// Scheduler config
const AI_TWITTER_JOB_HOUR = Number(process.env.AI_TWITTER_REPORT_HOUR || 8);
const AI_TWITTER_JOB_MINUTE = Number(process.env.AI_TWITTER_REPORT_MINUTE || 0);
const BROADCAST_DELAY_MS = Number(process.env.AI_TWITTER_BROADCAST_DELAY_MS || 150);
const TOPIC_SEED = 'ai-twitter-daily-topic';
const DEFAULT_TOPIC_ID = process.env.AI_TWITTER_TOPIC_ID || uuidv5(TOPIC_SEED, TOPIC_NAMESPACE);

const PODCAST_TITLE = 'AI Twitter Daily';
const PODCAST_DESCRIPTION = 'Daily summary of what AI researchers are discussing on Twitter.';
const PODCAST_CATEGORY = 'Technology';
const PODCAST_DEVICE_TOKEN = 'ai-twitter-daily-agent';
const PODCAST_SCRIPT_MODEL = 'gpt-4o-mini';
const PODCAST_TARGET_DURATION_MINUTES = 5;
const PODCAST_BUCKET = 'audio';

// Voice provider configuration
// Use Hume for AI Twitter Daily (same voice for TTS and future interactive mode)
const VOICE_PROVIDER = (process.env.AI_TWITTER_VOICE_PROVIDER || 'hume') as 'hume' | 'elevenlabs';
const HUME_VOICE_ID = process.env.AI_TWITTER_HUME_VOICE_ID || '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

const voiceProvider = getVoiceProvider(VOICE_PROVIDER, {
  voiceId: HUME_VOICE_ID,
});

export interface AITwitterDailyResult {
  date: string;
  analysis: AnalysisResult;
  reportUrl: string | null;
  reportShortLink: string | null;
  podcastUrl: string | null;
  podcastShortLink: string | null;
  episodeId: number | null;
  smsSummary: string;
  tweetCount: number;
}

/**
 * Main entry point: Run the AI Twitter Daily agent
 */
export async function runAITwitterDaily(options: {
  forceRegenerate?: boolean;
  hoursBack?: number;
} = {}): Promise<AITwitterDailyResult> {
  const { forceRegenerate = false, hoursBack = 24 } = options;
  const today = new Date().toISOString().split('T')[0];

  console.log(`[AI Twitter Daily] Starting daily run for ${today}`);

  // 1. Fetch tweets from curated accounts
  console.log('[AI Twitter Daily] Step 1: Fetching tweets...');
  const allTweets = await fetchAITwitterContent();
  const recentTweets = filterRecentTweets(allTweets, hoursBack);

  if (recentTweets.length === 0) {
    console.log('[AI Twitter Daily] No recent tweets found');
    return {
      date: today,
      analysis: {
        topicGroups: [],
        summary: 'No significant AI discussions found in the last 24 hours.',
        trendingTopics: [],
        date: today,
      },
      reportUrl: null,
      reportShortLink: null,
      podcastUrl: null,
      podcastShortLink: null,
      episodeId: null,
      smsSummary: 'AI Twitter Daily: No major discussions today.',
      tweetCount: 0,
    };
  }

  console.log(`[AI Twitter Daily] Found ${recentTweets.length} recent tweets`);

  // 2. Analyze tweets
  console.log('[AI Twitter Daily] Step 2: Analyzing tweets...');
  const analysis = await analyzeTweets(recentTweets);
  console.log(`[AI Twitter Daily] Found ${analysis.topicGroups.length} topic groups`);

  // 3. Generate markdown report
  console.log('[AI Twitter Daily] Step 3: Generating report...');
  const markdownReport = generateMarkdownReport(analysis);

  // 4. Store report to Supabase
  const storedReport = await storeAgentReport({
    agent: AGENT_SLUG,
    date: today,
    markdown: markdownReport,
    summary: analysis.summary.substring(0, 500),
  });

  const reportUrl = storedReport.publicUrl || null;
  let reportShortLink: string | null = null;
  if (reportUrl) {
    try {
      reportShortLink = await createShortLink(reportUrl, {
        context: 'ai-twitter-daily',
        createdBy: 'sms-bot',
        createdFor: 'ai-twitter-daily-agent',
      });
    } catch (error) {
      console.warn('[AI Twitter Daily] Failed to create report shortlink:', error);
    }
  }
  console.log(`[AI Twitter Daily] Report stored: ${reportShortLink || reportUrl}`);

  // 5. Store covered content for interactive mode
  console.log('[AI Twitter Daily] Step 4: Storing covered content...');
  await storeCoveredContent(today, analysis, recentTweets);

  // 6. Generate podcast (optional, only if ElevenLabs configured)
  let podcastUrl: string | null = null;
  let podcastShortLink: string | null = null;
  let episodeId: number | null = null;

  // Check if voice provider is configured (either Hume or ElevenLabs)
  const hasVoiceProvider = VOICE_PROVIDER === 'hume'
    ? !!process.env.HUME_API_KEY
    : !!process.env.ELEVENLABS_API_KEY;

  if (hasVoiceProvider) {
    console.log(`[AI Twitter Daily] Step 5: Generating podcast (${VOICE_PROVIDER})...`);
    try {
      const podcastResult = await generatePodcast({
        date: today,
        analysis,
        markdown: markdownReport,
        reportUrl,
        reportShortLink,
        forceRegenerate,
      });
      podcastUrl = podcastResult.audioUrl;
      podcastShortLink = podcastResult.shortLink;
      episodeId = podcastResult.episodeId;
      console.log(`[AI Twitter Daily] Podcast generated: ${podcastShortLink}`);
    } catch (error) {
      console.error('[AI Twitter Daily] Podcast generation failed:', error);
    }
  } else {
    console.log('[AI Twitter Daily] Skipping podcast (no voice API key configured)');
  }

  // 7. Generate SMS summary
  const smsSummary = generateSmsSummary(analysis);

  console.log('[AI Twitter Daily] Run complete');

  return {
    date: today,
    analysis,
    reportUrl,
    reportShortLink,
    podcastUrl,
    podcastShortLink,
    episodeId,
    smsSummary,
    tweetCount: recentTweets.length,
  };
}

/**
 * Store covered content for interactive mode
 */
async function storeCoveredContent(
  date: string,
  analysis: AnalysisResult,
  tweets: FetchedTweet[]
): Promise<void> {
  // Get or create episode ID for today
  const topicId = DEFAULT_TOPIC_ID;
  const { data: episode } = await supabase
    .from('episodes')
    .select('id')
    .eq('topic_id', topicId)
    .eq('published_date', date)
    .maybeSingle();

  const episodeId = episode?.id;

  // Store each topic group's tweets as covered content
  for (const group of analysis.topicGroups) {
    for (const tweet of group.tweets) {
      const tweetUrl = tweet.authorUsername && tweet.id
        ? `https://twitter.com/${tweet.authorUsername}/status/${tweet.id}`
        : null;

      await supabase.from('covered_content').upsert({
        episode_id: episodeId,
        content_type: 'tweet',
        external_id: tweet.id,
        title: group.topic,
        author: tweet.sourceHandle,
        summary: group.keyInsights.join(' '),
        full_text: tweet.text,
        url: tweetUrl,
        metadata: {
          topicGroup: group.topic,
          significance: group.significance,
          sourcePriority: tweet.sourcePriority,
        },
      }, {
        onConflict: 'external_id',
      });
    }
  }
}

/**
 * Generate podcast from analysis
 */
async function generatePodcast(input: {
  date: string;
  analysis: AnalysisResult;
  markdown: string;
  reportUrl: string | null;
  reportShortLink: string | null;
  forceRegenerate: boolean;
}): Promise<{ audioUrl: string; shortLink: string | null; episodeId: number }> {
  // Ensure topic exists
  const topicId = await ensureTopicExists();

  // Check for existing episode
  const { data: existing } = await supabase
    .from('episodes')
    .select('id, audio_url, short_link')
    .eq('topic_id', topicId)
    .eq('published_date', input.date)
    .maybeSingle();

  if (existing && !input.forceRegenerate) {
    return {
      audioUrl: existing.audio_url,
      shortLink: existing.short_link,
      episodeId: existing.id,
    };
  }

  // Generate script
  const script = await buildPodcastScript(input.analysis);

  // Synthesize audio
  const { audioBuffer, durationSeconds } = await synthesizeAudio(script);

  // Upload to storage
  const audioUrl = await uploadAudio(topicId, input.date, audioBuffer);

  // Create player URL and shortlink
  const episodeTitle = `${PODCAST_TITLE} — ${formatDate(input.date)}`;
  const playerUrl = buildMusicPlayerUrl({
    src: audioUrl,
    title: episodeTitle,
    description: input.analysis.summary.substring(0, 200),
    autoplay: true,
  });

  let shortLink: string | null = null;
  try {
    shortLink = await createShortLink(playerUrl, {
      context: 'ai-twitter-daily',
      createdBy: 'sms-bot',
      createdFor: 'ai-twitter-daily-agent',
    });
  } catch (error) {
    console.warn('[AI Twitter Daily] Failed to create shortlink:', error);
  }

  const resolvedShortLink = normalizeShortLinkDomain(shortLink ?? playerUrl);

  // Upsert episode
  const episodeId = await upsertEpisode({
    topicId,
    title: episodeTitle,
    script,
    durationSeconds,
    audioUrl,
    summary: input.analysis.summary,
    publishedDate: input.date,
    shortLink: resolvedShortLink,
    reportUrl: input.reportUrl,
    existingEpisodeId: existing?.id,
  });

  return {
    audioUrl,
    shortLink: resolvedShortLink,
    episodeId,
  };
}

/**
 * Build podcast script from analysis
 */
async function buildPodcastScript(analysis: AnalysisResult): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are writing a podcast script for "AI Twitter Daily" - a daily summary of what AI researchers are discussing on Twitter.

Today's analysis:
${JSON.stringify(analysis, null, 2)}

Write a conversational, engaging script (about ${PODCAST_TARGET_DURATION_MINUTES} minutes when spoken).

Guidelines:
- Start with a brief intro: "Welcome to AI Twitter Daily for [date]"
- Summarize the main topics being discussed
- Highlight 2-3 key insights or debates
- Keep it conversational but informative
- End with a brief outro
- NO stage directions or speaker labels
- Just the spoken text

The script should be interesting to AI practitioners and enthusiasts.`;

  const response = await openai.chat.completions.create({
    model: PODCAST_SCRIPT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Synthesize audio from script
 */
async function synthesizeAudio(script: string): Promise<{ audioBuffer: Buffer; durationSeconds: number }> {
  const result = await voiceProvider.synthesize(script, {
    description: 'Speak in a warm, engaging podcast host style. Natural pacing with appropriate pauses.',
  });
  return {
    audioBuffer: result.audioBuffer,
    durationSeconds: Math.round(result.duration),
  };
}

/**
 * Upload audio to Supabase storage
 */
async function uploadAudio(topicId: string, date: string, audioBuffer: Buffer): Promise<string> {
  const fileName = `${AGENT_SLUG}/${date}.mp3`;

  const { error } = await supabase.storage
    .from(PODCAST_BUCKET)
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload audio: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(PODCAST_BUCKET)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Ensure podcast topic exists
 */
async function ensureTopicExists(): Promise<string> {
  const topicId = DEFAULT_TOPIC_ID;

  const { data: existing } = await supabase
    .from('topics')
    .select('id')
    .eq('id', topicId)
    .maybeSingle();

  if (existing) {
    return topicId;
  }

  const { error } = await supabase.from('topics').insert({
    id: topicId,
    title: PODCAST_TITLE,
    description: PODCAST_DESCRIPTION,
    type: 'dated',
    status: 'ready',
  });

  if (error && error.code !== '23505') { // Ignore duplicate key
    throw error;
  }

  return topicId;
}

/**
 * Upsert episode to database
 */
async function upsertEpisode(params: {
  topicId: string;
  title: string;
  script: string;
  durationSeconds: number;
  audioUrl: string;
  summary: string;
  publishedDate: string;
  shortLink: string | null;
  reportUrl: string | null;
  existingEpisodeId?: number;
}): Promise<number> {
  const episodeData = {
    topic_id: params.topicId,
    title: params.title,
    script: params.script,
    duration_seconds: params.durationSeconds,
    audio_url: params.audioUrl,
    summary: params.summary,
    published_date: params.publishedDate,
    short_link: params.shortLink,
    report_url: params.reportUrl,
    status: 'ready',
  };

  if (params.existingEpisodeId) {
    const { error } = await supabase
      .from('episodes')
      .update(episodeData)
      .eq('id', params.existingEpisodeId);

    if (error) throw error;
    return params.existingEpisodeId;
  }

  const { data, error } = await supabase
    .from('episodes')
    .insert(episodeData)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00Z');
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(date);
}

/**
 * Get topic ID for this agent
 */
export function getTopicId(): string {
  return DEFAULT_TOPIC_ID;
}

/**
 * Build SMS message for AI Twitter Daily broadcast
 */
async function buildAITwitterMessage(
  result: AITwitterDailyResult,
  recipient: string
): Promise<string> {
  const lines: string[] = [];

  // Header with date
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(result.date + 'T12:00:00Z'));

  lines.push(`🐦 AI Twitter Daily — ${dateFormatted}`);

  // Summary
  if (result.smsSummary) {
    lines.push(result.smsSummary);
  } else if (result.analysis.summary) {
    const summary = result.analysis.summary.substring(0, 200);
    lines.push(summary);
  }

  lines.push('');

  // Get or create proper links
  let reportLink: string | null = null;
  let podcastLink: string | null = null;

  // Report link via report-viewer
  const reportMetadata = await getLatestReportMetadata(AGENT_SLUG);
  if (reportMetadata) {
    const viewerUrl = buildReportViewerUrl({ path: reportMetadata.reportPath });
    try {
      reportLink = await createShortLink(viewerUrl, {
        context: 'ai-twitter-daily',
        createdFor: recipient,
        createdBy: 'sms-bot',
      });
    } catch {
      reportLink = viewerUrl;
    }
  }

  // Podcast link via music-player
  if (result.podcastShortLink) {
    podcastLink = normalizeShortLinkDomain(result.podcastShortLink);
  } else if (result.podcastUrl) {
    const playerUrl = buildMusicPlayerUrl({
      src: result.podcastUrl,
      title: `AI Twitter Daily — ${dateFormatted}`,
      autoplay: true,
    });
    try {
      podcastLink = await createShortLink(playerUrl, {
        context: 'ai-twitter-daily',
        createdFor: recipient,
        createdBy: 'sms-bot',
      });
    } catch {
      podcastLink = playerUrl;
    }
  }

  if (podcastLink) {
    lines.push(`🎧 Listen: ${podcastLink}`);
  }

  if (reportLink) {
    lines.push(`📄 Read: ${reportLink}`);
  }

  return lines.join('\n');
}

/**
 * Broadcast AI Twitter Daily to all subscribers
 */
async function broadcastAITwitterDaily(
  result: AITwitterDailyResult,
  twilioClient: TwilioClient
): Promise<void> {
  try {
    const subscribers = await getAgentSubscribers(AGENT_SLUG);

    if (!subscribers.length) {
      console.log('[AI Twitter Daily] Broadcast: no active subscribers.');
      return;
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      console.error('[AI Twitter Daily] Cannot broadcast: TWILIO_PHONE_NUMBER not configured');
      return;
    }

    let sent = 0;
    let skipped = 0;

    for (const subscriber of subscribers) {
      // Check if already sent today (dedup)
      if (subscriber.last_sent_at) {
        const lastSent = new Date(subscriber.last_sent_at);
        const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 20) {
          skipped++;
          continue;
        }
      }

      try {
        const message = await buildAITwitterMessage(result, subscriber.phone_number);

        await twilioClient.messages.create({
          body: message,
          to: subscriber.phone_number,
          from: fromNumber,
        });

        await markAgentReportSent(subscriber.phone_number, AGENT_SLUG);
        sent++;

        // Rate limit delay
        await new Promise((resolve) => setTimeout(resolve, BROADCAST_DELAY_MS));
      } catch (error) {
        console.error(`[AI Twitter Daily] Failed to send to ${subscriber.phone_number}:`, error);
      }
    }

    console.log(`[AI Twitter Daily] Broadcast complete: ${sent} sent, ${skipped} skipped (already received)`);
  } catch (error) {
    console.error('[AI Twitter Daily] Broadcast failed:', error);
  }
}

/**
 * Register daily job for AI Twitter Daily
 */
export function registerAITwitterDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'ai-twitter-daily',
    hour: AI_TWITTER_JOB_HOUR,
    minute: AI_TWITTER_JOB_MINUTE,
    timezone: 'America/Los_Angeles',
    run: async () => {
      console.log('[AI Twitter Daily] Starting scheduled run...');
      try {
        const result = await runAITwitterDaily();
        console.log(`[AI Twitter Daily] Report generated for ${result.date}: ${result.tweetCount} tweets, ${result.analysis.topicGroups.length} topics`);

        if (result.tweetCount > 0) {
          await broadcastAITwitterDaily(result, twilioClient);
        } else {
          console.log('[AI Twitter Daily] No tweets found, skipping broadcast');
        }
      } catch (error) {
        console.error('[AI Twitter Daily] Scheduled run failed:', error);
      }
    },
  });
}
