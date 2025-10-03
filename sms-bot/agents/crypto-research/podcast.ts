import { supabase } from '../../lib/supabase.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';
import OpenAI from 'openai';
import { v5 as uuidv5 } from 'uuid';
import ElevenLabsProvider from './ElevenLabsProvider.js';

const DEFAULT_TOPIC_NAMESPACE = uuidv5.URL;
const DEFAULT_TOPIC_SEED = 'crypto-daily-topic';

const DEFAULT_TOPIC_ID = process.env.CRYPTO_PODCAST_TOPIC_ID
  || uuidv5(DEFAULT_TOPIC_SEED, DEFAULT_TOPIC_NAMESPACE);

const PODCAST_TITLE = process.env.CRYPTO_PODCAST_TITLE
  || 'Crypto Market Daily Brief';

const PODCAST_DESCRIPTION = process.env.CRYPTO_PODCAST_DESCRIPTION
  || 'Daily spoken summary generated from the B52s crypto research report.';

const PODCAST_CATEGORY = process.env.CRYPTO_PODCAST_CATEGORY
  || 'Finance';

const PODCAST_DEVICE_TOKEN = process.env.CRYPTO_PODCAST_DEVICE_TOKEN
  || 'crypto-daily-agent';

const PODCAST_SCRIPT_MODEL = process.env.CRYPTO_PODCAST_SCRIPT_MODEL
  || 'gpt-4o-mini';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.CRYPTO_PODCAST_ELEVENLABS_VOICE_ID || 'MF3mGyEYCl7XYWbV9V6O';
const ELEVENLABS_MODEL_ID = process.env.CRYPTO_PODCAST_ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';
const ELEVENLABS_STABILITY = process.env.CRYPTO_PODCAST_ELEVENLABS_STABILITY
  ? Number(process.env.CRYPTO_PODCAST_ELEVENLABS_STABILITY)
  : 0.5;
const ELEVENLABS_SIMILARITY = process.env.CRYPTO_PODCAST_ELEVENLABS_SIMILARITY
  ? Number(process.env.CRYPTO_PODCAST_ELEVENLABS_SIMILARITY)
  : 0.5;
const ELEVENLABS_STYLE = process.env.CRYPTO_PODCAST_ELEVENLABS_STYLE
  ? Number(process.env.CRYPTO_PODCAST_ELEVENLABS_STYLE)
  : 0;

const PODCAST_TARGET_DURATION_MINUTES = Number(process.env.CRYPTO_PODCAST_TARGET_MINUTES || 6);

const PODCAST_BUCKET = process.env.CRYPTO_PODCAST_AUDIO_BUCKET || 'audio-files';

const elevenLabsProvider = new ElevenLabsProvider({
  apiKey: ELEVENLABS_API_KEY,
  defaultVoice: ELEVENLABS_VOICE_ID,
  defaultModel: ELEVENLABS_MODEL_ID,
});

export interface PodcastGenerationInput {
  date: string;
  markdown: string;
  summary: string;
  reportUrl: string | null;
  reportShortLink: string | null;
  forceRegenerate?: boolean;
}

export interface PodcastGenerationResult {
  audioUrl: string;
  shortLink: string | null;
  reportLink: string | null;
  topicId: string;
  episodeId: number;
  title: string;
  durationSeconds: number;
}

class PodcastGenerationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PodcastGenerationError';
    if (cause instanceof Error && cause.stack) {
      this.stack += `\nCaused by: ${cause.stack}`;
    }
  }
}

function requireOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new PodcastGenerationError('OPENAI_API_KEY is required for podcast generation');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateCryptoPodcast(
  input: PodcastGenerationInput
): Promise<PodcastGenerationResult> {
  console.log('📝 Starting crypto podcast generation for', input.date);
  console.log('Input:', JSON.stringify(input, null, 2));

  try {

    const topicId = await ensureTopicExists();
    console.log('✓ Topic ensured:', topicId);

    const existingEpisode = await findExistingEpisode(topicId, input.date);
    const shouldReuse = existingEpisode && !input.forceRegenerate;

    if (existingEpisode) {
      console.log('✓ Found existing episode:', existingEpisode.episodeId);
      await ensureTopicEpisodePointer(topicId, existingEpisode.episodeId);
      if (shouldReuse) {
        console.log('↩ Reusing existing episode (forceRegenerate=false)');
        return existingEpisode;
      }
      console.log('🔄 Regenerating episode (forceRegenerate=true)');
    }

    console.log('🤖 Generating podcast script via OpenAI...');
    const script = await buildPodcastScript(input);
    console.log('✓ Script generated:', script.length, 'characters');

    console.log('🎙️ Synthesizing audio via ElevenLabs...');
    const { audioBuffer, durationSeconds } = await synthesizeAudio(script);
    console.log('✓ Audio synthesized:', audioBuffer.length, 'bytes,', durationSeconds, 'seconds');

    console.log('☁️ Uploading audio to Supabase storage...');
    const { audioUrl, shortLink } = await uploadAndLinkAudio({
      topicId,
      date: input.date,
      audioBuffer,
    });
    console.log('✓ Audio uploaded:', audioUrl);
    console.log('✓ Short link created:', shortLink);

    const episodeTitle = buildEpisodeTitle(input.date);

    console.log('💾 Upserting episode to database...');
    const episodeId = await upsertEpisode({
      topicId,
      title: episodeTitle,
      script,
      durationSeconds,
      audioUrl,
      summary: input.summary,
      publishedDate: input.date,
      shortLink,
      reportUrl: input.reportUrl,
      reportShortLink: input.reportShortLink,
      existingEpisode,
    });
    console.log('✓ Episode saved:', episodeId);

    console.log('✅ Crypto podcast generation complete');

    return {
      audioUrl,
      shortLink,
      reportLink: input.reportShortLink ?? input.reportUrl,
      topicId,
      episodeId,
      title: episodeTitle,
      durationSeconds,
    };
} catch (error) {
    console.error('❌ Crypto podcast generation failed at step');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    console.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    if (error instanceof PodcastGenerationError) {
      throw error;
    }

    // Log the actual error details before wrapping
    if (error instanceof Error) {
      console.error('Error is instance of Error');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Error is NOT instance of Error, raw value:', error);
    }

    throw new PodcastGenerationError('Failed to generate crypto podcast', error);
  }
}

export async function lookupCryptoPodcastEpisode(date: string): Promise<PodcastGenerationResult | null> {
  try {
    const topicId = await ensureTopicExists();
    return findExistingEpisode(topicId, date);
  } catch (error) {
    console.error('Failed to lookup crypto podcast episode:', error);
    return null;
  }
}

async function ensureTopicExists(): Promise<string> {
  const topicId = DEFAULT_TOPIC_ID;

  const { data: existing, error: fetchError } = await supabase
    .from('topics')
    .select('id')
    .eq('id', topicId)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    if (fetchError.code === '42P01') {
      // Topics table not available – fall back to shows schema
      throw new PodcastGenerationError(
        'Crash topics table not found – legacy schema is not yet supported by this integration.',
        fetchError
      );
    }
    throw fetchError;
  }

  if (existing) {
    return topicId;
  }

  const basePayload = {
    id: topicId,
    title: PODCAST_TITLE,
    description: PODCAST_DESCRIPTION,
    type: 'dated',
    status: 'ready',
  } as Record<string, unknown>;

  const richPayload = {
    ...basePayload,
    category: PODCAST_CATEGORY,
    device_token: PODCAST_DEVICE_TOKEN,
    user_prompt: 'Autogenerated daily crypto market briefing from B52s research agent.',
    duration_requested: PODCAST_TARGET_DURATION_MINUTES,
    number_of_episodes: 1,
    episode_structure: {
      cadence: 'daily',
      generator: 'crypto-research-agent',
    },
  };

  const insertResult = await supabase
    .from('topics')
    .insert(richPayload)
    .select('id')
    .single();

  if (insertResult.error) {
    const code = insertResult.error.code;

    if (code === '42703' || code === '23502') {
      const fallback = await supabase
        .from('topics')
        .insert(basePayload)
        .select('id')
        .single();

      if (fallback.error) {
        throw fallback.error;
      }

      return topicId;
    }

    throw insertResult.error;
  }

  return topicId;
}

function buildEpisodeTitle(isoDate: string): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(isoDate));

  return `${PODCAST_TITLE} — ${formatted}`;
}

async function findExistingEpisode(
  topicId: string,
  isoDate: string
): Promise<(PodcastGenerationResult & { episodeNumber: number }) | null> {
  const episodeTitle = buildEpisodeTitle(isoDate);

  const { data, error } = await supabase
    .from('episodes')
    .select('id, audio_url, estimated_duration, show_notes_json, episode_number')
    .eq('topic_id', topicId)
    .eq('title', episodeTitle)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    return null;
  }

  const durationMinutes = Number(data.estimated_duration) || PODCAST_TARGET_DURATION_MINUTES;
  const durationSeconds = Math.round(durationMinutes * 60);

  let shortLink: string | null = null;
  let reportLink: string | null = null;

  if (data.show_notes_json && typeof data.show_notes_json === 'object') {
    const notes = data.show_notes_json as Record<string, unknown>;
    const audioInfo = notes.audio;
    if (audioInfo && typeof audioInfo === 'object') {
      const candidate = (audioInfo as Record<string, unknown>).shortLink;
      if (typeof candidate === 'string' && candidate.length > 0) {
        shortLink = candidate;
      }
    }

    if (!shortLink) {
      const legacy = notes.shortLink;
      if (typeof legacy === 'string' && legacy.length > 0) {
        shortLink = legacy;
      }
    }

    const links = Array.isArray(notes.links) ? notes.links : [];
    const reportEntry = links.find((link) =>
      link && typeof link === 'object' && (link as Record<string, unknown>).type === 'crypto_research_report'
    );

    if (reportEntry && typeof reportEntry === 'object') {
      const candidate = (reportEntry as Record<string, unknown>).url;
      if (typeof candidate === 'string' && candidate.length > 0) {
        reportLink = candidate;
      }
    }

    if (!reportLink) {
      const legacyReport = notes.reportLink;
      if (typeof legacyReport === 'string' && legacyReport.length > 0) {
        reportLink = legacyReport;
      }
    }
  }

  return {
    audioUrl: data.audio_url,
    shortLink,
    reportLink,
    topicId,
    episodeId: data.id,
    title: episodeTitle,
    durationSeconds,
    episodeNumber: data.episode_number || 1,
  };
}

async function buildPodcastScript(input: PodcastGenerationInput): Promise<string> {
  const client = requireOpenAI();

  const systemPrompt = [
    'You are the narrator for a short daily crypto market podcast.',
    'Using the research report markdown provided, craft a conversational script that can be read aloud.',
    'Keep the tone clear, confident, and informative. Avoid headings or markdown, respond with plain text paragraphs only.',
    'Aim for a runtime of approximately 5 minutes when read at a normal pace.',
    'Highlight the biggest market moves, key statistics, and notable storylines.',
    'Open with a quick greeting and end with a concise sign-off.',
  ].join(' ');

  const response = await client.chat.completions.create({
    model: PODCAST_SCRIPT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.markdown },
    ],
    temperature: 0.5,
    max_tokens: 1200,
  });

  const script = response.choices[0]?.message?.content?.trim();

  if (!script) {
    throw new PodcastGenerationError('OpenAI returned an empty script for the podcast');
  }

  return script;
}

async function synthesizeAudio(script: string): Promise<{ audioBuffer: Buffer; durationSeconds: number }> {
  if (!ELEVENLABS_API_KEY) {
    throw new PodcastGenerationError('ELEVENLABS_API_KEY is required for podcast narration');
  }

  if (!elevenLabsProvider.isInitialized) {
    await elevenLabsProvider.initialize();

    if (!elevenLabsProvider.isInitialized) {
      throw new PodcastGenerationError('Failed to initialize ElevenLabs provider');
    }
  }

  const result = await elevenLabsProvider.synthesize(script, {
    voice_id: ELEVENLABS_VOICE_ID,
    model: ELEVENLABS_MODEL_ID,
    stability: ELEVENLABS_STABILITY,
    similarity_boost: ELEVENLABS_SIMILARITY,
    style: ELEVENLABS_STYLE,
    use_speaker_boost: true,
  });

  const audioBuffer = result.audioBuffer;
  const durationSeconds = Number(result.duration ?? estimateDurationFromScript(script));

  return { audioBuffer, durationSeconds };
}

function estimateDurationFromScript(script: string): number {
  const words = script.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 155;
  return Math.max(60, Math.round((words / wordsPerMinute) * 60));
}

async function uploadAndLinkAudio(params: {
  topicId: string;
  date: string;
  audioBuffer: Buffer;
}): Promise<{ audioUrl: string; shortLink: string | null }> {
  const { topicId, date, audioBuffer } = params;
  await ensureAudioBucketExists();
  const filePath = `topics/${topicId}/episodes/${date}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from(PODCAST_BUCKET)
    .upload(filePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(PODCAST_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    throw new PodcastGenerationError('Could not obtain public URL for podcast audio');
  }

  let shortLink: string | null = null;
  try {
    shortLink = await createShortLink(publicUrl, {
      context: 'crypto-podcast',
      createdBy: 'sms-bot',
      createdFor: 'crypto-agent',
    });
  } catch (error) {
    console.warn('Failed to create short link for crypto podcast audio:', error);
  }

  return { audioUrl: publicUrl, shortLink };
}

async function ensureAudioBucketExists(): Promise<void> {
  const { data, error } = await supabase.storage.getBucket(PODCAST_BUCKET);

  if (!error && data) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(PODCAST_BUCKET, {
    public: true,
  });

  if (createError) {
    const status = (createError as { status?: number }).status;
    if (status === 409) {
      return;
    }
    throw createError;
  }
}

interface EpisodeUpsertInput {
  topicId: string;
  title: string;
  script: string;
  durationSeconds: number;
  audioUrl: string;
  summary: string;
  publishedDate: string;
  shortLink: string | null;
  reportUrl: string | null;
  reportShortLink: string | null;
  existingEpisode?: (PodcastGenerationResult & { episodeNumber: number });
}

async function upsertEpisode(input: EpisodeUpsertInput): Promise<number> {
  const episodeNumber = input.existingEpisode
    ? input.existingEpisode.episodeNumber
    : await findNextEpisodeNumber(input.topicId);

  const segments = buildTranscriptSegments(input.script, input.durationSeconds);

  const estimatedDurationMinutes = Number((input.durationSeconds / 60).toFixed(2));
  const wordCount = input.script.split(/\s+/).filter(Boolean).length;

  const reportLink = input.reportShortLink ?? input.reportUrl ?? null;

  const payload = {
    topic_id: input.topicId,
    episode_number: episodeNumber,
    title: input.title,
    description: input.summary,
    transcript: input.script,
    word_count: wordCount,
    estimated_duration: estimatedDurationMinutes,
    audio_generated: true,
    audio_url: input.audioUrl,
    show_notes: input.summary,
    show_notes_json: buildShowNotesJson({
      summary: input.summary,
      publishedDate: input.publishedDate,
      audioUrl: input.audioUrl,
      audioShortLink: input.shortLink ?? input.audioUrl,
      reportLink,
      reportUrl: input.reportUrl,
    }),
    status: 'ready',
  } as Record<string, unknown>;

  console.log('Crypto podcast episode payload', {
    episode_number: episodeNumber,
    title: input.title,
    show_notes_json: payload.show_notes_json,
    updating: Boolean(input.existingEpisode),
  });

  let episodeId: number;

  if (input.existingEpisode) {
    console.log('Updating existing episode:', input.existingEpisode.episodeId);
    const updatePayload = { ...payload };
    delete updatePayload.topic_id;
    delete updatePayload.episode_number;

    console.log('Update payload keys:', Object.keys(updatePayload));

    const updateResult = await supabase
      .from('episodes')
      .update(updatePayload)
      .eq('id', input.existingEpisode.episodeId)
      .select('id')
      .single();

    if (updateResult.error) {
      console.error('❌ Episode update failed:', updateResult.error);
      console.error('Error code:', updateResult.error.code);
      console.error('Error message:', updateResult.error.message);
      console.error('Error details:', updateResult.error.details);
      throw updateResult.error;
    }

    episodeId = updateResult.data.id as number;
    console.log('✓ Episode updated:', episodeId);
  } else {
    const insertResult = await supabase
      .from('episodes')
      .insert(payload)
      .select('id')
      .single();

    if (insertResult.error) {
      if (insertResult.error.code === '42703') {
        const trimmedPayload = {
          topic_id: input.topicId,
          episode_number: episodeNumber,
          title: input.title,
          description: input.summary,
          transcript: input.script,
          estimated_duration: estimatedDurationMinutes,
          audio_url: input.audioUrl,
          status: 'ready',
        } as Record<string, unknown>;

        const fallback = await supabase
          .from('episodes')
          .insert(trimmedPayload)
          .select('id')
          .single();

        if (fallback.error) {
          throw fallback.error;
        }

        await updateCurrentEpisodePointer(input.topicId, fallback.data.id as number);
        return fallback.data.id as number;
      }

      throw insertResult.error;
    }

    episodeId = insertResult.data.id as number;
  }

  console.log('Upserting transcript for episode:', episodeId);
  try {
    await upsertTranscript({
      episodeId,
      segments,
      fullText: input.script,
    });
    console.log('✓ Transcript upserted');
  } catch (transcriptError) {
    console.warn('⚠️ Transcript upsert failed (non-fatal):', transcriptError);
    console.warn('Podcast episode saved successfully, but transcript could not be stored.');
  }

  console.log('Updating current episode pointer...');
  await updateCurrentEpisodePointer(input.topicId, episodeId);
  console.log('✓ Episode pointer updated');

  return episodeId;
}

async function findNextEpisodeNumber(topicId: string): Promise<number> {
  const { data, error } = await supabase
    .from('episodes')
    .select('episode_number')
    .eq('topic_id', topicId)
    .order('episode_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data || typeof data.episode_number !== 'number') {
    return 1;
  }

  return data.episode_number + 1;
}

function buildTranscriptSegments(script: string, totalDuration: number) {
  const paragraphs = script
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const totalWordCount = paragraphs
    .map((p) => p.split(/\s+/).filter(Boolean).length)
    .reduce((sum, count) => sum + count, 0);

  let cursor = 0;
  const segments = [] as Array<{ start: number; end: number; text: string; speaker: string }>;

  for (const paragraph of paragraphs) {
    const wordCount = paragraph.split(/\s+/).filter(Boolean).length;
    const fraction = totalWordCount > 0 ? wordCount / totalWordCount : 0;
    const duration = fraction * totalDuration;
    const start = cursor;
    const end = cursor + duration;
    cursor = end;

    segments.push({
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      text: paragraph,
      speaker: 'Host',
    });
  }

  return segments;
}

async function upsertTranscript(params: {
  episodeId: number;
  segments: Array<{ start: number; end: number; text: string; speaker: string }>;
  fullText: string;
}): Promise<void> {
  try {
    console.log('Deleting old transcript for episode:', params.episodeId);
    const { error: deleteError } = await supabase
      .from('transcripts')
      .delete()
      .eq('episode_id', params.episodeId);

    if (deleteError && deleteError.code !== 'PGRST116' && deleteError.code !== '42P01') {
      console.error('Delete transcript error:', deleteError);
      throw deleteError;
    }
    console.log('Old transcript deleted (or none existed)');

    console.log('Inserting new transcript, segments count:', params.segments.length);
    const { error } = await supabase
      .from('transcripts')
      .insert({
        episode_id: params.episodeId,
        segments: params.segments,
        full_text: params.fullText,
      });

    if (error) {
      console.error('Insert transcript error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);

      if (error.code !== '23505') {
        throw error;
      } else {
        console.log('Duplicate transcript (23505), ignoring');
      }
    }
    console.log('Transcript insert completed');
  } catch (error) {
    console.error('upsertTranscript caught error:', error);
    console.error('Error type:', typeof error);
    const code = (error as { code?: string } | null)?.code;
    console.error('Error code extracted:', code);

    if (code === '42P01') {
      console.warn('Transcripts table not available; skipping transcript insert for crypto podcast.');
      return;
    }

    console.error('Re-throwing transcript error');
    throw error;
  }
}

async function updateCurrentEpisodePointer(topicId: string, episodeId: number): Promise<void> {
  const { error } = await supabase
    .from('topics')
    .update({ current_episode_id: episodeId })
    .eq('id', topicId);

  if (error) {
    throw error;
  }
}

async function ensureTopicEpisodePointer(topicId: string, episodeId: number): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('current_episode_id')
      .eq('id', topicId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data || data.current_episode_id === episodeId) {
      return;
    }

    await updateCurrentEpisodePointer(topicId, episodeId);
  } catch (error) {
    console.warn('Unable to ensure crypto podcast topic pointer:', error);
  }
}

function buildShowNotesJson(params: {
  summary: string;
  publishedDate: string;
  audioUrl: string;
  audioShortLink: string;
  reportLink: string | null;
  reportUrl: string | null;
}) {
  const { summary, publishedDate, audioUrl, audioShortLink, reportLink, reportUrl } = params;

  const cleanedSummary = summary.trim();
  const primaryLink = reportLink ?? reportUrl ?? null;

  const links = [] as Array<{ url: string; type: string; target: string }>;

  if (primaryLink) {
    links.push({
      url: primaryLink,
      type: 'crypto_research_report',
      target: 'Full research report',
    });
  }

  return {
    theme: 'Crypto market daily brief',
    description: cleanedSummary,
    notes: cleanedSummary,
    publishedDate,
    audio: {
      url: audioUrl,
      shortLink: audioShortLink,
    },
    links,
    reportLink: primaryLink ?? undefined,
  };
}
