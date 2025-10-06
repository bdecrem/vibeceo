import type { AiDailyEpisode } from '../sms/ai-daily.js';

const PLAYER_BASE_FALLBACK = 'https://b52s.me';

const PACIFIC_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'short',
  day: 'numeric',
});

function getPlayerBaseUrl(): string {
  const configured = process.env.SHORTLINK_BASE_URL;
  const base = configured && configured.trim().length ? configured : PLAYER_BASE_FALLBACK;
  return base.replace(/\/$/, '');
}

function buildEpisodeTitle(episode: AiDailyEpisode): string {
  const publishedDate = episode.publishedAt ? new Date(episode.publishedAt) : new Date();
  const validDate = Number.isNaN(publishedDate.getTime()) ? new Date() : publishedDate;
  const formattedDate = PACIFIC_LABEL_FORMATTER.format(validDate);
  return episode.title?.trim() || `AI Daily ${formattedDate}`;
}

function buildEpisodeDescription(episode: AiDailyEpisode): string | null {
  const snippet = episode.snippet?.trim();
  if (!snippet) {
    return null;
  }

  if (snippet.length <= 160) {
    return snippet;
  }

  return `${snippet.slice(0, 157).trim()}…`;
}

export function buildAiDailyMusicPlayerUrl(episode: AiDailyEpisode): string {
  const params = new URLSearchParams();
  params.set('src', episode.audioUrl);
  params.set('title', buildEpisodeTitle(episode));

  const description = buildEpisodeDescription(episode);
  if (description) {
    params.set('description', description);
  }

  params.set('autoplay', '1');

  return `${getPlayerBaseUrl()}/music-player?${params.toString()}`;
}
