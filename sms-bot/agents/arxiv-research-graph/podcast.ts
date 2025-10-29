import { supabase } from '../../lib/supabase.js';
import { createShortLink, normalizeShortLinkDomain } from '../../lib/utils/shortlink-service.js';
import { buildMusicPlayerUrl } from '../../lib/utils/music-player-link.js';
import OpenAI from 'openai';
import { v5 as uuidv5 } from 'uuid';
import ElevenLabsProvider from '../crypto-research/ElevenLabsProvider.js';

const DEFAULT_TOPIC_NAMESPACE = uuidv5.URL;
const DEFAULT_TOPIC_SEED = 'arxiv-daily-topic';

const DEFAULT_TOPIC_ID = process.env.ARXIV_PODCAST_TOPIC_ID
  || uuidv5(DEFAULT_TOPIC_SEED, DEFAULT_TOPIC_NAMESPACE);

export function getPodcastTopicId(): string {
  return DEFAULT_TOPIC_ID;
}

const PODCAST_TITLE = process.env.ARXIV_PODCAST_TITLE
  || 'arXiv Today';

const PODCAST_DESCRIPTION = process.env.ARXIV_PODCAST_DESCRIPTION
  || 'Daily spoken summary of the latest AI research papers from arXiv.';

const PODCAST_CATEGORY = process.env.ARXIV_PODCAST_CATEGORY
  || 'Science';

const PODCAST_DEVICE_TOKEN = process.env.ARXIV_PODCAST_DEVICE_TOKEN
  || 'arxiv-daily-agent';

const PODCAST_SCRIPT_MODEL = process.env.ARXIV_PODCAST_SCRIPT_MODEL
  || 'gpt-4o-mini';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ARXIV_PODCAST_ELEVENLABS_VOICE_ID || 'MF3mGyEYCl7XYWbV9V6O';
const ELEVENLABS_MODEL_ID = process.env.ARXIV_PODCAST_ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';
const ELEVENLABS_STABILITY = process.env.ARXIV_PODCAST_ELEVENLABS_STABILITY
  ? Number(process.env.ARXIV_PODCAST_ELEVENLABS_STABILITY)
  : 0.5;
const ELEVENLABS_SIMILARITY = process.env.ARXIV_PODCAST_ELEVENLABS_SIMILARITY
  ? Number(process.env.ARXIV_PODCAST_ELEVENLABS_SIMILARITY)
  : 0.5;
const ELEVENLABS_STYLE = process.env.ARXIV_PODCAST_ELEVENLABS_STYLE
  ? Number(process.env.ARXIV_PODCAST_ELEVENLABS_STYLE)
  : 0;

const PODCAST_TARGET_DURATION_MINUTES = Number(process.env.ARXIV_PODCAST_TARGET_MINUTES || 4);

const PODCAST_BUCKET = 'audio';

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

type ExistingEpisode = PodcastGenerationResult & {
  episodeNumber: number;
  rawShowNotesJson?: unknown;
};

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

export async function generateArxivPodcast(
  input: PodcastGenerationInput
): Promise<PodcastGenerationResult> {
  console.log('📝 Starting arXiv podcast generation for', input.date);

  try {
    const topicId = await ensureTopicExists();
    console.log('✓ Topic ensured:', topicId);

    let existingEpisode = await findExistingEpisode(topicId, input.date);
    const shouldRegenerate = Boolean(input.forceRegenerate);

    if (existingEpisode && !shouldRegenerate) {
      console.log('↩ Reusing existing episode (forceRegenerate=false)');
      return existingEpisode;
    }

    if (existingEpisode) {
      console.log('🔄 Regenerating episode (forceRegenerate=true)');
    }

    console.log('🤖 Generating podcast script via OpenAI...');
    const script = await buildPodcastScript(input);
    console.log('✓ Script generated:', script.length, 'characters');

    console.log('🎙️ Synthesizing audio via ElevenLabs...');
    const { audioBuffer, durationSeconds } = await synthesizeAudio(script);
    console.log('✓ Audio synthesized:', audioBuffer.length, 'bytes,', durationSeconds, 'seconds');

    console.log('☁️ Uploading audio to Supabase storage...');
    const { audioUrl } = await uploadAndLinkAudio({
      topicId,
      date: input.date,
      audioBuffer,
    });
    console.log('✓ Audio uploaded:', audioUrl);

    const episodeTitle = buildEpisodeTitle(input.date);

    const playerUrl = buildMusicPlayerUrl({
      src: audioUrl,
      title: episodeTitle,
      description: input.summary,
      autoplay: true,
    });

    let shortLink: string | null = null;
    try {
      shortLink = await createShortLink(playerUrl, {
        context: 'arxiv-podcast',
        createdBy: 'sms-bot',
        createdFor: 'arxiv-agent',
      });
    } catch (error) {
      console.warn('Failed to create player short link for arXiv podcast:', error);
    }

    const resolvedShortLink = normalizeShortLinkDomain(shortLink ?? playerUrl);
    console.log('✓ Short link prepared:', resolvedShortLink);

    console.log('💾 Upserting episode to database...');
    const episodeId = await upsertEpisode({
      topicId,
      title: episodeTitle,
      script,
      durationSeconds,
      audioUrl,
      summary: input.summary,
      publishedDate: input.date,
      shortLink: resolvedShortLink,
      reportUrl: input.reportUrl,
      reportShortLink: input.reportShortLink,
      existingEpisode,
    });
    console.log('✓ Episode saved:', episodeId);

    console.log('✅ arXiv podcast generation complete');

    return {
      audioUrl,
      shortLink: resolvedShortLink,
      reportLink: input.reportShortLink ?? input.reportUrl,
      topicId,
      episodeId,
      title: episodeTitle,
      durationSeconds,
    };
  } catch (error) {
    console.error('❌ arXiv podcast generation failed');
    console.error('Error:', error);

    if (error instanceof PodcastGenerationError) {
      throw error;
    }

    throw new PodcastGenerationError('Failed to generate arXiv podcast', error);
  }
}

export async function lookupArxivPodcastEpisode(date: string): Promise<PodcastGenerationResult | null> {
  try {
    const topicId = await ensureTopicExists();
    return findExistingEpisode(topicId, date);
  } catch (error) {
    console.error('Failed to lookup arXiv podcast episode:', error);
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
    throw fetchError;
  }

  if (existing) {
    await syncTopicMetadata(topicId);
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
    user_prompt: 'Autogenerated daily arXiv AI research briefing from B52s research agent.',
    duration_requested: PODCAST_TARGET_DURATION_MINUTES,
    number_of_episodes: 1,
    episode_structure: {
      cadence: 'daily',
      generator: 'arxiv-research-agent',
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

      await syncTopicMetadata(topicId);
      return topicId;
    }

    throw insertResult.error;
  }

  await syncTopicMetadata(topicId);
  return topicId;
}

async function syncTopicMetadata(topicId: string): Promise<void> {
  const baseUpdate = {
    title: PODCAST_TITLE,
    description: PODCAST_DESCRIPTION,
    type: 'dated',
    status: 'ready',
  } as Record<string, unknown>;

  const richUpdate = {
    ...baseUpdate,
    category: PODCAST_CATEGORY,
    device_token: PODCAST_DEVICE_TOKEN,
    user_prompt: 'Autogenerated daily arXiv AI research briefing from B52s research agent.',
    duration_requested: PODCAST_TARGET_DURATION_MINUTES,
    number_of_episodes: 1,
    episode_structure: {
      cadence: 'daily',
      generator: 'arxiv-research-agent',
    },
  };

  const { error } = await supabase
    .from('topics')
    .update(richUpdate)
    .eq('id', topicId);

  if (!error) {
    return;
  }

  if (error.code === '42703' || error.code === '23502') {
    console.warn(
      'Topics table missing extended metadata columns – applying minimal arXiv topic metadata update.'
    );

    const { error: fallbackError } = await supabase
      .from('topics')
      .update(baseUpdate)
      .eq('id', topicId);

    if (fallbackError) {
      throw fallbackError;
    }

    return;
  }

  throw error;
}

function parseIsoDateForPacificMidday(isoDate: string): Date | null {
  const parts = isoDate.split('-').map(Number);

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function buildEpisodeTitle(isoDate: string): string {
  const parsed = parseIsoDateForPacificMidday(isoDate) ?? new Date(isoDate);

  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(parsed);

  return `${PODCAST_TITLE} — ${formatted}`;
}

async function findExistingEpisode(
  topicId: string,
  isoDate: string
): Promise<ExistingEpisode | null> {
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
        shortLink = normalizeShortLinkDomain(candidate);
      }
    }

    if (!shortLink) {
      const legacy = notes.shortLink;
      if (typeof legacy === 'string' && legacy.length > 0) {
        shortLink = normalizeShortLinkDomain(legacy);
      }
    }

    const links = Array.isArray(notes.links) ? notes.links : [];
    const reportEntry = links.find((link) =>
      link && typeof link === 'object' && (link as Record<string, unknown>).type === 'arxiv_research_report'
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

    if ((!shortLink || shortLink === data.audio_url) && typeof data.audio_url === 'string') {
      const description = (() => {
        const summary = typeof notes.summary === 'string' ? notes.summary : null;
        if (summary && summary.trim().length) {
          return summary;
        }

        const notesDescription = typeof notes.description === 'string' ? notes.description : null;
        if (notesDescription && notesDescription.trim().length) {
          return notesDescription;
        }

        return null;
      })();

      shortLink = normalizeShortLinkDomain(buildMusicPlayerUrl({
        src: data.audio_url,
        title: episodeTitle,
        description,
        autoplay: true,
      }));
    }
  }

  const normalizedShortLink = shortLink ? normalizeShortLinkDomain(shortLink) : null;

  return {
    audioUrl: data.audio_url,
    shortLink: normalizedShortLink,
    reportLink,
    topicId,
    episodeId: data.id,
    title: episodeTitle,
    durationSeconds,
    episodeNumber: data.episode_number || 1,
    rawShowNotesJson: data.show_notes_json ?? undefined,
  };
}

async function buildPodcastScript(input: PodcastGenerationInput): Promise<string> {
  const client = requireOpenAI();

  const systemPrompt = [
    'You are the narrator for a short daily AI research podcast covering the latest arXiv papers.',
    'Using the research report markdown provided, craft a conversational script that can be read aloud.',
    'Keep the tone clear, enthusiastic but professional, and informative. Avoid headings or markdown, respond with plain text paragraphs only.',
    'CRITICAL: Write ALL numbers as words, not digits. For example, write "ninety-two percent" instead of "92%". Write "three point five" instead of "3.5".',
    `Aim for a runtime of approximately ${PODCAST_TARGET_DURATION_MINUTES} minutes when read at a normal pace.`,
    'Focus on the most exciting and impactful papers, explaining their significance in accessible terms.',
    'Open with a quick greeting and the date, end with a concise sign-off.',
  ].join(' ');

  const response = await client.chat.completions.create({
    model: PODCAST_SCRIPT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.markdown },
    ],
    temperature: 0.6,
    max_tokens: 1000,
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
}): Promise<{ audioUrl: string }> {
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

  return { audioUrl: publicUrl };
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
  existingEpisode?: ExistingEpisode;
}

async function upsertEpisode(input: EpisodeUpsertInput): Promise<number> {
  const episodeNumber = input.existingEpisode
    ? input.existingEpisode.episodeNumber
    : await findNextEpisodeNumber(input.topicId);

  const segments = buildTranscriptSegments(input.script, input.durationSeconds);

  const estimatedDurationMinutes = Number((input.durationSeconds / 60).toFixed(2));
  const wordCount = input.script.split(/\s+/).filter(Boolean).length;

  const normalizedShortLink = input.shortLink ? normalizeShortLinkDomain(input.shortLink) : null;
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
      audioShortLink: normalizedShortLink ?? input.audioUrl,
      reportLink,
      reportUrl: input.reportUrl,
    }),
    status: 'ready',
  } as Record<string, unknown>;

  let episodeId: number;

  if (input.existingEpisode) {
    console.log('Updating existing episode:', input.existingEpisode.episodeId);
    const updatePayload = { ...payload };
    delete updatePayload.topic_id;
    delete updatePayload.episode_number;

    const updateResult = await supabase
      .from('episodes')
      .update(updatePayload)
      .eq('id', input.existingEpisode.episodeId)
      .select('id')
      .single();

    if (updateResult.error) {
      console.error('❌ Episode update failed:', updateResult.error);
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

  try {
    await upsertTranscript({
      episodeId,
      segments,
      fullText: input.script,
    });
    console.log('✓ Transcript upserted');
  } catch (transcriptError) {
    console.warn('⚠️ Transcript upsert failed (non-fatal):', transcriptError);
  }

  await updateCurrentEpisodePointer(input.topicId, episodeId);

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
  const { data, error: fetchError } = await supabase
    .from('episodes')
    .select('show_notes_json')
    .eq('id', params.episodeId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const existingShowNotes =
    data?.show_notes_json && typeof data.show_notes_json === 'object'
      ? JSON.parse(JSON.stringify(data.show_notes_json)) as Record<string, unknown>
      : {};

  const updatedShowNotes = {
    ...existingShowNotes,
    transcriptSegments: params.segments,
  };

  const { error: updateError } = await supabase
    .from('episodes')
    .update({
      transcript: params.fullText,
      show_notes_json: updatedShowNotes,
    })
    .eq('id', params.episodeId);

  if (updateError) {
    throw updateError;
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
      type: 'arxiv_research_report',
      target: 'Full research report',
    });
  }

  return {
    theme: 'arXiv AI research daily brief',
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
