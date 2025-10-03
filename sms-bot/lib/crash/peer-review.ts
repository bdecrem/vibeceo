import { supabase } from '../supabase.js';
import { createShortLink } from '../utils/shortlink-service.js';

export interface PeerReviewLink {
  label: string;
  url: string;
}

export interface PeerReviewEpisode {
  topicId: string;
  topicTitle: string;
  episodeId: number;
  episodeNumber: number | null;
  title: string;
  description: string | null;
  publishedAt: string | null;
  audioUrl: string | null;
  showNotesJson?: Record<string, unknown> | null;
  storiesData?: unknown;
}

interface TopicRow {
  id: string;
  title: string | null;
  current_episode_id: number | null;
}

interface EpisodeRow {
  id: number;
  topic_id: string;
  episode_number: number | null;
  title: string | null;
  description: string | null;
  audio_url: string | null;
  show_notes_json: Record<string, unknown> | null;
  stories_data: unknown;
  created_at: string | null;
  updated_at: string | null;
}

const PEER_REVIEW_TOPIC_ID = '5c6c2fd7-fcec-417b-ab48-27db253443b8';
const PEER_REVIEW_DEFAULT_TITLE = 'Peer Review Fight Club';
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'numeric',
  day: 'numeric'
});

let cachedTopic: TopicRow | null = null;

async function fetchTopic(): Promise<TopicRow> {
  if (cachedTopic) {
    return cachedTopic;
  }

  const { data, error } = await supabase
    .from('topics')
    .select('id, title, current_episode_id')
    .eq('id', PEER_REVIEW_TOPIC_ID)
    .maybeSingle();

  if (error) {
    console.error('Failed to load Peer Review topic metadata:', error);
    throw new Error('Unable to load Peer Review topic metadata');
  }

  if (!data) {
    throw new Error('Peer Review topic not found in Supabase');
  }

  cachedTopic = data as TopicRow;
  return cachedTopic;
}

async function fetchEpisodeById(id: number): Promise<EpisodeRow | null> {
  const { data, error } = await supabase
    .from('episodes')
    .select(
      'id, topic_id, episode_number, title, description, audio_url, show_notes_json, stories_data, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load Peer Review episode by id:', error);
    return null;
  }

  return (data as EpisodeRow | null) ?? null;
}

async function fetchLatestEpisode(): Promise<EpisodeRow | null> {
  const { data, error } = await supabase
    .from('episodes')
    .select(
      'id, topic_id, episode_number, title, description, audio_url, show_notes_json, stories_data, created_at, updated_at'
    )
    .eq('topic_id', PEER_REVIEW_TOPIC_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Failed to load latest Peer Review episode:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as EpisodeRow;
}

function toPeerReviewEpisode(topic: TopicRow, episode: EpisodeRow): PeerReviewEpisode {
  return {
    topicId: topic.id,
    topicTitle: topic.title ?? PEER_REVIEW_DEFAULT_TITLE,
    episodeId: episode.id,
    episodeNumber: episode.episode_number ?? null,
    title: episode.title ?? PEER_REVIEW_DEFAULT_TITLE,
    description: episode.description ?? null,
    publishedAt: episode.created_at ?? episode.updated_at,
    audioUrl: episode.audio_url ?? null,
    showNotesJson: episode.show_notes_json ?? null,
    storiesData: episode.stories_data ?? null,
  };
}

export async function getLatestPeerReviewEpisode(): Promise<PeerReviewEpisode> {
  const topic = await fetchTopic();

  let episode: EpisodeRow | null = null;

  if (typeof topic.current_episode_id === 'number') {
    episode = await fetchEpisodeById(topic.current_episode_id);
  }

  if (!episode) {
    episode = await fetchLatestEpisode();
  }

  if (!episode) {
    throw new Error('No Peer Review episodes available in Supabase');
  }

  return toPeerReviewEpisode(topic, episode);
}

function ensureTrailingPeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function formatPeerReviewSms(
  episode: PeerReviewEpisode,
  options: { shortLink?: string } = {}
): string {
  const fallbackDate = new Date();
  const publishedDate = episode.publishedAt ? new Date(episode.publishedAt) : fallbackDate;
  const dateToFormat = Number.isNaN(publishedDate.getTime()) ? fallbackDate : publishedDate;
  const formattedDate = DATE_FORMATTER.format(dateToFormat);

  const snippet = ensureTrailingPeriod(
    extractSnippet(episode) || 'Latest episode update.'
  );
  const base = `🎙️ Peer Review Fight Club ${formattedDate}`;
  const headline = `${base} — ${snippet}`;

  const listenUrl = options.shortLink ?? episode.audioUrl ?? undefined;
  const listenLine = listenUrl
    ? `Listen here: ${listenUrl} or text PR LINKS.`
    : 'Listen link unavailable right now. Text PR LINKS for sources.';

  return `${headline} ${listenLine}`.trim();
}

function stripBrandPrefix(text: string): string {
  const pattern = new RegExp(`^${PEER_REVIEW_DEFAULT_TITLE}[^A-Za-z0-9]+`, 'i');
  return text.replace(pattern, '').trim();
}

function extractSnippet(episode: PeerReviewEpisode): string {
  const titleCandidate = episode.title?.trim();
  if (titleCandidate) {
    const sanitized = stripBrandPrefix(titleCandidate);
    if (sanitized && sanitized.toLowerCase() !== PEER_REVIEW_DEFAULT_TITLE.toLowerCase()) {
      return sanitized;
    }
    if (titleCandidate.toLowerCase() !== PEER_REVIEW_DEFAULT_TITLE.toLowerCase()) {
      return titleCandidate;
    }
  }

  const showNotes = episode.showNotesJson as { summary?: string } | null | undefined;
  const summaryCandidate = showNotes?.summary?.trim();
  if (summaryCandidate) {
    const sanitized = stripBrandPrefix(summaryCandidate);
    if (sanitized) {
      return sanitized;
    }
    return summaryCandidate;
  }

  const descriptionCandidate = episode.description?.trim();
  if (descriptionCandidate) {
    const sanitized = stripBrandPrefix(descriptionCandidate);
    if (sanitized) {
      return sanitized;
    }
    return descriptionCandidate;
  }

  return '';
}

export async function getPeerReviewShortLink(
  episode: PeerReviewEpisode,
  createdFor?: string
): Promise<string | null> {
  if (!episode.audioUrl) {
    return null;
  }

  return createShortLink(episode.audioUrl, {
    context: 'peer_review_fight_club',
    createdFor,
    createdBy: 'sms-bot',
  });
}

export function extractPeerReviewLinks(episode: PeerReviewEpisode): PeerReviewLink[] {
  const links: PeerReviewLink[] = [];

  const showNotes = episode.showNotesJson as {
    links?: Array<{ url?: string; target?: string; label?: string }>;
  } | null | undefined;

  if (showNotes?.links && Array.isArray(showNotes.links)) {
    for (const entry of showNotes.links) {
      const url = entry?.url?.trim();
      if (!url) {
        continue;
      }

      const label = entry?.label?.trim() || entry?.target?.trim() || 'Link';
      links.push({ label, url });
    }
  }

  const stories = Array.isArray(episode.storiesData) ? episode.storiesData : null;
  if (stories) {
    for (const item of stories as Array<{ title?: string; source_url?: string; url?: string }>) {
      const url = item?.source_url?.trim() || item?.url?.trim();
      if (!url) {
        continue;
      }

      const label = item?.title?.trim();
      links.push({ label: label || 'Source', url });
    }
  }

  const deduped: PeerReviewLink[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const key = link.url.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(link);
  }

  return deduped;
}

export function formatPeerReviewLinks(episode: PeerReviewEpisode): string | null {
  const links = extractPeerReviewLinks(episode);
  if (!links.length) {
    return null;
  }

  const formattedLinks = links.slice(0, 5).map((link) => {
    const normalizedLabel = link.label || 'Source';
    const sanitizedUrl = link.url.replace(/^https?:\/\//i, '');
    return `${normalizedLabel}: ${sanitizedUrl}`;
  });

  return [
    "Sources from today's Peer Review Fight Club:",
    ...formattedLinks,
  ].join('\n');
}
