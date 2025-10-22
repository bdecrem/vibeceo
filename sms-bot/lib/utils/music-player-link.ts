import type { AiDailyEpisode } from '../sms/ai-daily.js';

const PLAYER_BASE_FALLBACK = 'https://kochi.to';

const PACIFIC_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'short',
  day: 'numeric',
});

type MusicPlayerParams = {
  src: string;
  title: string;
  description?: string | null;
  autoplay?: boolean;
};

function getPlayerBaseUrl(): string {
  const configured = process.env.SHORTLINK_BASE_URL;
  const base = configured && configured.trim().length ? configured : PLAYER_BASE_FALLBACK;
  return base.replace(/\/$/, '');
}

function truncateDescription(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 160) {
    return trimmed;
  }

  return `${trimmed.slice(0, 157).trim()}…`;
}

export function buildMusicPlayerUrl(params: MusicPlayerParams): string {
  const { src, title, description, autoplay = true } = params;
  const urlParams = new URLSearchParams();
  urlParams.set('src', src);

  const normalizedTitle = title && title.trim().length ? title.trim() : 'Audio track';
  urlParams.set('title', normalizedTitle);

  const normalizedDescription = truncateDescription(description);
  if (normalizedDescription) {
    urlParams.set('description', normalizedDescription);
  }

  if (autoplay) {
    urlParams.set('autoplay', '1');
  }

  return `${getPlayerBaseUrl()}/music-player?${urlParams.toString()}`;
}

function buildEpisodeTitle(episode: AiDailyEpisode): string {
  const publishedDate = episode.publishedAt ? new Date(episode.publishedAt) : new Date();
  const validDate = Number.isNaN(publishedDate.getTime()) ? new Date() : publishedDate;
  const formattedDate = PACIFIC_LABEL_FORMATTER.format(validDate);
  const episodeInfo = episode.title?.trim() || formattedDate;
  return `AI Daily — ${episodeInfo}`;
}

function buildEpisodeDescription(episode: AiDailyEpisode): string | null {
  return truncateDescription(episode.snippet);
}

export function buildAiDailyMusicPlayerUrl(episode: AiDailyEpisode): string {
  return buildMusicPlayerUrl({
    src: episode.audioUrl,
    title: buildEpisodeTitle(episode),
    description: buildEpisodeDescription(episode),
    autoplay: true,
  });
}
