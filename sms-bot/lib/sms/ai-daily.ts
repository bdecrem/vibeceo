import axios, { AxiosError } from 'axios';
import { createShortLink } from '../utils/shortlink-service.js';

export interface AiDailyEpisode {
  topicId: string;
  topicTitle: string;
  episodeId: number;
  episodeNumber: number;
  title: string;
  publishedAt: string;
  audioUrl: string;
  snippet: string;
  transcriptLength: number;
  wordCount: number;
  updatedAt: string;
  currentEpisodeNumber: number;
}

const DEFAULT_BASE_URL = 'https://theaf-web.ngrok.io';
const MAX_FETCH_ATTEMPTS = 2;
const FETCH_TIMEOUT_MS = Number(process.env.AI_DAILY_TIMEOUT_MS || 2000);
const CACHE_TTL_MS = Number(process.env.AI_DAILY_CACHE_TTL_MS || 5 * 60 * 1000);
const PACIFIC_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'numeric',
  day: 'numeric'
});

let cachedEpisode: AiDailyEpisode | null = null;
let cacheTimestamp = 0;

function getBaseUrl(): string {
  const configuredBase = process.env.AI_DAILY_BASE_URL;
  if (!configuredBase || configuredBase.trim().length === 0) {
    return DEFAULT_BASE_URL;
  }
  return configuredBase.trim().replace(/\/$/, '');
}

function buildEndpoint(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/ai-daily/latest`;
}

function isCacheValid(): boolean {
  if (!cachedEpisode) {
    return false;
  }
  const now = Date.now();
  return now - cacheTimestamp < CACHE_TTL_MS;
}

function recordCache(episode: AiDailyEpisode): AiDailyEpisode {
  cachedEpisode = episode;
  cacheTimestamp = Date.now();
  return episode;
}

async function delay(durationMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

async function fetchEpisodeWithRetry(): Promise<AiDailyEpisode> {
  const endpoint = buildEndpoint();
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < MAX_FETCH_ATTEMPTS) {
    try {
      const response = await axios.get<AiDailyEpisode>(endpoint, {
        timeout: FETCH_TIMEOUT_MS
      });

      if (!response.data) {
        throw new Error('Empty response payload from AI Daily endpoint');
      }

      return recordCache(response.data);
    } catch (error) {
      lastError = error;
      attempt += 1;
      const axiosError = error as AxiosError;
      console.warn(`AI Daily fetch attempt ${attempt} failed: ${axiosError.message}`);

      if (attempt < MAX_FETCH_ATTEMPTS) {
        await delay(200);
      }
    }
  }

  const errorMessage = lastError instanceof Error
    ? lastError.message
    : 'Unknown error retrieving AI Daily episode';

  throw new Error(`AI Daily fetch failed after ${MAX_FETCH_ATTEMPTS} attempts: ${errorMessage}`);
}

export async function getLatestAiDailyEpisode(forceRefresh = false): Promise<AiDailyEpisode> {
  if (!forceRefresh && isCacheValid()) {
    return cachedEpisode as AiDailyEpisode;
  }

  return fetchEpisodeWithRetry();
}

export function formatAiDailySms(
  episode: AiDailyEpisode,
  options: { shortLink?: string } = {}
): string {
  const fallbackDate = new Date();
  const publishedDate = episode.publishedAt ? new Date(episode.publishedAt) : fallbackDate;
  const dateToFormat = Number.isNaN(publishedDate.getTime()) ? fallbackDate : publishedDate;
  const formattedDate = PACIFIC_DATE_FORMATTER.format(dateToFormat);
  const snippet = episode.snippet?.trim() || '';
  const micPrefix = '🎙 ';
  const headlineBase = snippet
    ? `AI Daily ${formattedDate} — ${snippet}`
    : `AI Daily ${formattedDate}`;
  const headline = `${micPrefix}${headlineBase}`;
  const cta = options.shortLink
    ? `Hear it here: ${options.shortLink} or text LINKS.`
    : 'Hear it here: text LISTEN or LINKS.';

  return `${headline}\n${cta}`.trim();
}

export async function getAiDailyShortLink(
  episode: AiDailyEpisode,
  createdFor?: string
): Promise<string | null> {
  if (!episode.audioUrl) {
    return null;
  }

  return createShortLink(episode.audioUrl, {
    context: 'ai_daily',
    createdFor,
    createdBy: 'sms-bot'
  });
}
