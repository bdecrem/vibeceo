import { supabase } from '../../lib/supabase.js';
import { createShortLink, normalizeShortLinkDomain } from '../../lib/utils/shortlink-service.js';
import { buildMusicPlayerUrl } from '../../lib/utils/music-player-link.js';
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

const LEGACY_PODCAST_BUCKET = 'audio-files';
const configuredPodcastBucket = process.env.CRYPTO_PODCAST_AUDIO_BUCKET;

const PODCAST_BUCKET =
  configuredPodcastBucket && configuredPodcastBucket !== LEGACY_PODCAST_BUCKET
    ? configuredPodcastBucket
    : 'audio';

if (configuredPodcastBucket === LEGACY_PODCAST_BUCKET) {
  console.warn(
    'CRYPTO_PODCAST_AUDIO_BUCKET is set to legacy bucket "audio-files". Using "audio" instead.'
  );
}

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

export async function generateCryptoPodcast(
  input: PodcastGenerationInput
): Promise<PodcastGenerationResult> {
  console.log('📝 Starting crypto podcast generation for', input.date);
  console.log('Input:', JSON.stringify(input, null, 2));

  try {

    const topicId = await ensureTopicExists();
    console.log('✓ Topic ensured:', topicId);

    await normalizeTopicEpisodes(topicId);

    let existingEpisode = await findExistingEpisode(topicId, input.date);
    let shouldRegenerate = Boolean(input.forceRegenerate);

    if (existingEpisode) {
      console.log('✓ Found existing episode:', existingEpisode.episodeId);
      await ensureTopicEpisodePointer(topicId, existingEpisode.episodeId);

      if (!shouldRegenerate && isLegacyAudioUrl(existingEpisode.audioUrl)) {
        console.log('🚚 Episode audio stored in legacy bucket; migrating to current storage...');
        try {
          existingEpisode = await migrateEpisodeAudioToCurrentBucket({
            topicId,
            episode: existingEpisode,
          });
          console.log('✓ Episode audio migrated to bucket:', PODCAST_BUCKET);
        } catch (migrationError) {
          console.warn('⚠️ Legacy audio migration failed, forcing regeneration:', migrationError);
          shouldRegenerate = true;
        }
      }
    }

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
        context: 'crypto-podcast',
        createdBy: 'sms-bot',
        createdFor: 'crypto-agent',
      });
    } catch (error) {
      console.warn('Failed to create player short link for crypto podcast:', error);
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

    console.log('✅ Crypto podcast generation complete');

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
    await normalizeTopicEpisodes(topicId);
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
    user_prompt: 'Autogenerated daily crypto market briefing from B52s research agent.',
    duration_requested: PODCAST_TARGET_DURATION_MINUTES,
    number_of_episodes: 1,
    episode_structure: {
      cadence: 'daily',
      generator: 'crypto-research-agent',
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
      'Topics table missing extended metadata columns – applying minimal crypto topic metadata update.'
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

function buildEpisodeTitle(isoDate: string): string {
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

async function normalizeTopicEpisodes(topicId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('id, audio_url, show_notes_json, episode_number, title')
      .eq('topic_id', topicId);

    if (error) {
      if (error.code === '42P01') {
        console.warn('Episodes table not found while normalizing crypto topic; skipping.');
        return;
      }
      throw error;
    }

    if (!data) {
      return;
    }

    for (const row of data) {
      if (!row || typeof row.id !== 'number') {
        continue;
      }

      const audioUrl = typeof row.audio_url === 'string' ? row.audio_url : null;
      const showNotes = row.show_notes_json ?? undefined;

      if (!audioUrl) {
        continue;
      }

      if (isLegacyAudioUrl(audioUrl)) {
        try {
          await migrateEpisodeAudio({
            topicId,
            episodeId: row.id,
            audioUrl,
            showNotesJson: showNotes,
          });
        } catch (migrationError) {
          console.warn(
            `⚠️ Failed migrating crypto episode ${row.id} to new audio bucket:`,
            migrationError
          );
        }
        continue;
      }

      const { changed, value } = prepareNormalizedShowNotesAudio(showNotes, audioUrl);

      if (changed) {
        const { error: updateError } = await supabase
          .from('episodes')
          .update({ show_notes_json: value })
          .eq('id', row.id);

        if (updateError) {
          console.warn('⚠️ Failed to refresh show_notes_json for episode', row.id, updateError);
        }
      }
    }
  } catch (normalizationError) {
    console.warn('⚠️ Failed to normalize crypto topic episodes:', normalizationError);
  }
}

async function migrateEpisodeAudioToCurrentBucket(params: {
  topicId: string;
  episode: ExistingEpisode;
}): Promise<ExistingEpisode> {
  const { episode, topicId } = params;
  const migrationResult = await migrateEpisodeAudio({
    topicId,
    episodeId: episode.episodeId,
    audioUrl: episode.audioUrl,
    showNotesJson: episode.rawShowNotesJson,
  });

  return {
    ...episode,
    audioUrl: migrationResult.audioUrl,
    rawShowNotesJson: migrationResult.showNotesJson,
  };
}

async function migrateEpisodeAudio(params: {
  topicId: string;
  episodeId: number;
  audioUrl: string;
  showNotesJson?: unknown;
}): Promise<{ audioUrl: string; showNotesJson?: unknown }> {
  const { topicId, episodeId, audioUrl, showNotesJson } = params;

  const filePath = extractStoragePathFromPublicUrl(audioUrl, LEGACY_PODCAST_BUCKET);

  if (!filePath) {
    throw new PodcastGenerationError(
      `Could not determine storage path for legacy crypto audio in bucket ${LEGACY_PODCAST_BUCKET}`
    );
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(LEGACY_PODCAST_BUCKET)
    .download(filePath);

  if (downloadError) {
    throw new PodcastGenerationError('Failed to download legacy crypto audio', downloadError);
  }

  if (!blob) {
    throw new PodcastGenerationError('Legacy crypto audio download returned empty data');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await ensureAudioBucketExists();

  const { error: uploadError } = await supabase.storage
    .from(PODCAST_BUCKET)
    .upload(filePath, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new PodcastGenerationError('Failed to upload crypto audio to new bucket', uploadError);
  }

  const { data: publicData } = supabase.storage
    .from(PODCAST_BUCKET)
    .getPublicUrl(filePath);

  const newAudioUrl = publicData?.publicUrl;

  if (!newAudioUrl) {
    throw new PodcastGenerationError('Could not obtain new public URL for migrated audio');
  }

  const updatedShowNotes = await applyEpisodeAudioUrlUpdate({
    episodeId,
    audioUrl: newAudioUrl,
    showNotesJson,
  });

  console.log('✓ Migrated crypto audio for episode', episodeId, 'to bucket', PODCAST_BUCKET);

  const { error: removeError } = await supabase.storage
    .from(LEGACY_PODCAST_BUCKET)
    .remove([filePath]);

  if (removeError) {
    console.warn(
      `⚠️ Unable to remove legacy crypto audio file topics/${topicId} after migration:`,
      removeError
    );
  }

  return {
    audioUrl: newAudioUrl,
    showNotesJson: updatedShowNotes,
  };
}

async function applyEpisodeAudioUrlUpdate(params: {
  episodeId: number;
  audioUrl: string;
  showNotesJson?: unknown;
}): Promise<unknown | undefined> {
  const { episodeId, audioUrl, showNotesJson } = params;
  const { changed, value } = prepareNormalizedShowNotesAudio(showNotesJson, audioUrl);

  const updatePayload: Record<string, unknown> = { audio_url: audioUrl };

  if (changed) {
    updatePayload.show_notes_json = value;
  }

  const { error } = await supabase
    .from('episodes')
    .update(updatePayload)
    .eq('id', episodeId);

  if (error) {
    throw error;
  }

  return changed ? value : showNotesJson;
}

function prepareNormalizedShowNotesAudio(
  showNotesJson: unknown,
  audioUrl: string
): { changed: boolean; value?: Record<string, unknown> } {
  if (!showNotesJson || typeof showNotesJson !== 'object') {
    return {
      changed: true,
      value: {
        audio: { url: audioUrl },
      },
    };
  }

  const cloned = JSON.parse(JSON.stringify(showNotesJson)) as Record<string, unknown>;
  const audioEntry = cloned.audio && typeof cloned.audio === 'object'
    ? { ...(cloned.audio as Record<string, unknown>) }
    : {};

  const currentUrl = typeof audioEntry.url === 'string' ? audioEntry.url : null;
  const currentShortLink =
    typeof audioEntry.shortLink === 'string' ? audioEntry.shortLink : null;

  let changed = false;

  if (currentUrl !== audioUrl) {
    audioEntry.url = audioUrl;
    changed = true;
  }

  if (currentShortLink) {
    const normalized = normalizeShortLinkDomain(currentShortLink);
    if (normalized !== currentShortLink) {
      audioEntry.shortLink = normalized;
      changed = true;
    }
  }

  cloned.audio = audioEntry;

  if (changed) {
    return { changed: true, value: cloned };
  }

  return { changed: false };
}

function isLegacyAudioUrl(audioUrl: string): boolean {
  try {
    const url = new URL(audioUrl);
    return url.pathname.includes(`/storage/v1/object/public/${LEGACY_PODCAST_BUCKET}/`);
  } catch (error) {
    return audioUrl.includes(`${LEGACY_PODCAST_BUCKET}/`);
  }
}

function extractStoragePathFromPublicUrl(audioUrl: string, bucket: string): string | null {
  try {
    const url = new URL(audioUrl);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const idx = url.pathname.indexOf(prefix);
    if (idx === -1) {
      return null;
    }
    const path = url.pathname.slice(idx + prefix.length);
    return decodeURIComponent(path);
  } catch (error) {
    const fallbackPrefix = `${bucket}/`;
    const idx = audioUrl.indexOf(fallbackPrefix);
    if (idx === -1) {
      return null;
    }
    return audioUrl.slice(idx + fallbackPrefix.length);
  }
}

async function buildPodcastScript(input: PodcastGenerationInput): Promise<string> {
  const client = requireOpenAI();

  const systemPrompt = [
    'You are the narrator for a short daily crypto market podcast.',
    'Using the research report markdown provided, craft a conversational script that can be read aloud.',
    'Keep the tone clear, confident, and informative. Avoid headings or markdown, respond with plain text paragraphs only.',
    'CRITICAL: Write ALL numbers as words, not digits. For example, write "one hundred twenty-five thousand dollars" instead of "$125,000". Write "four point six percent" instead of "4.6%".',
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

  const reportLink = input.reportShortLink ?? input.reportUrl ?? null;
  const normalizedShortLink = input.shortLink
    ? normalizeShortLinkDomain(input.shortLink)
    : null;

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
    console.log('Embedding transcript into episode:', params.episodeId);

    const { data, error: fetchError } = await supabase
      .from('episodes')
      .select('show_notes_json')
      .eq('id', params.episodeId)
      .maybeSingle();

    if (fetchError) {
      console.error('Failed loading episode for transcript update:', fetchError);
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
      console.error('Episode transcript update failed:', updateError);
      throw updateError;
    }

    console.log(
      '✓ Transcript stored with episode; segments:',
      params.segments.length
    );
  } catch (error) {
    console.error('upsertTranscript caught error:', error);
    console.error('Error type:', typeof error);
    const code = (error as { code?: string } | null)?.code;
    console.error('Error code extracted:', code);

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
