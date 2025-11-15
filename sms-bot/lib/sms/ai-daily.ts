import axios, { AxiosError } from 'axios';
import { buildAiDailyMusicPlayerUrl } from '../utils/music-player-link.js';
import { createShortLink } from '../utils/shortlink-service.js';
import { getLatestStoredArxivGraphReport } from '../../agents/arxiv-research-graph/index.js';
import { storeAgentReport } from '../../agents/report-storage.js';
import { supabase } from '../supabase.js';

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
  showNotesJson?: {
    links?: Array<{
      url: string;
      target: string;
      type: string;
    }>;
    notes?: string;
    summary?: string;
  };
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

// Episode cache: stores episode data and its associated short link
// Both are cleared when a new episode is fetched or cache expires
let cachedEpisode: AiDailyEpisode | null = null;
let cachedShortLink: string | null = null;
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
  // Clear the short link cache when a new episode is cached
  cachedShortLink = null;
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
  options: { shortLink?: string; reportLink?: string } = {}
): string {
  const fallbackDate = new Date();
  const publishedDate = episode.publishedAt ? new Date(episode.publishedAt) : fallbackDate;
  const dateToFormat = Number.isNaN(publishedDate.getTime()) ? fallbackDate : publishedDate;
  const formattedDate = PACIFIC_DATE_FORMATTER.format(dateToFormat);
  const snippet = episode.snippet?.trim() || '';
  const micPrefix = '🎙️ ';
  const headlineBase = snippet
    ? `AI Research Daily ${formattedDate} — ${snippet}`
    : `AI Research Daily ${formattedDate}`;
  const headline = `${micPrefix}${headlineBase}`;

  // Build CTA with both podcast and report links
  const lines = [];

  if (options.shortLink) {
    lines.push(`Listen: ${options.shortLink}`);
  } else {
    lines.push('Listen: text LISTEN');
  }

  if (options.reportLink) {
    lines.push(`Read: ${options.reportLink}`);
  }

  const cta = lines.join('\n');

  return `${headline}\n${cta}`.trim();
}

export async function getAiDailyShortLink(
  episode: AiDailyEpisode,
  createdFor?: string
): Promise<string | null> {
  if (!episode.audioUrl) {
    return null;
  }

  // Return cached short link if available and cache is still valid
  if (cachedShortLink && isCacheValid()) {
    return cachedShortLink;
  }

  const playerUrl = buildAiDailyMusicPlayerUrl(episode);

  try {
    const shortLink = await createShortLink(playerUrl, {
      context: 'ai_daily',
      createdFor,
      createdBy: 'sms-bot'
    });

    // Cache the short link for reuse
    if (shortLink) {
      cachedShortLink = shortLink;
    }

    return shortLink ?? playerUrl;
  } catch (error) {
    console.warn('Failed to create AI Daily player short link:', error);
    return playerUrl;
  }
}

interface EpisodeLink {
  url: string;
  target: string;
  type: string;
}

export function formatAiDailyLinks(episode: AiDailyEpisode): string | null {
  const links = (episode.showNotesJson as { links?: EpisodeLink[] } | undefined)?.links;
  if (!links?.length) {
    return null;
  }

  const huggingfaceLinks = links.filter((link) => link.type === 'huggingface').slice(0, 3);

  if (!huggingfaceLinks.length) {
    return null;
  }

  const formattedLinks = huggingfaceLinks.map((link) => {
    const label = link.target.split(':')[0].trim();
    const shortenedUrl = link.url.replace(/^https?:\/\//i, '');
    return `${label}: ${shortenedUrl}`;
  });

  return [
    "Here's the papers we cover in today's episode of the AI Daily:",
    ...formattedLinks
  ].join('\n');
}

/**
 * Retrieve the markdown content of the latest arXiv report
 */
async function fetchArxivReportMarkdown(reportPath: string): Promise<string | null> {
  const bucket = process.env.AGENT_REPORTS_BUCKET || 'agent-reports';

  try {
    const { data: file, error } = await supabase.storage
      .from(bucket)
      .download(reportPath);

    if (error) {
      console.error('Failed to download arXiv report:', error);
      return null;
    }

    return await file.text();
  } catch (error) {
    console.error('Error fetching arXiv report markdown:', error);
    return null;
  }
}

/**
 * Build combined AI Research Daily report markdown
 */
export async function buildAiResearchDailyReport(
  episode: AiDailyEpisode,
  shortLink?: string
): Promise<{ markdown: string; date: string; summary: string } | null> {
  // Get today's date in Pacific Time
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pacificNow.getFullYear();
  const month = String(pacificNow.getMonth() + 1).padStart(2, '0');
  const day = String(pacificNow.getDate()).padStart(2, '0');
  const reportDate = `${year}-${month}-${day}`;

  // Build AI Daily section
  const aiDailySms = formatAiDailySms(episode, { shortLink });
  const aiDailyLinks = formatAiDailyLinks(episode);

  // Get latest arXiv report
  const arxivReport = await getLatestStoredArxivGraphReport();

  if (!arxivReport) {
    console.warn('No arXiv report available for combined report');
    return null;
  }

  // Fetch arXiv report markdown content
  const arxivMarkdown = await fetchArxivReportMarkdown(arxivReport.reportPath);

  if (!arxivMarkdown) {
    console.warn('Failed to fetch arXiv report markdown content');
    return null;
  }

  // Build combined markdown
  const sections = [
    `# AI Research Daily ${month}/${day}`,
    '',
    aiDailySms,
    ''
  ];

  if (aiDailyLinks) {
    sections.push('## Papers Covered in Today\'s Episode');
    sections.push('');
    // Extract just the links (skip the intro line)
    const linksOnly = aiDailyLinks.split('\n').slice(1).join('\n');
    sections.push(linksOnly);
    sections.push('');
  }

  sections.push('## IN DEPTH: AI Research Papers from ARXIV');
  sections.push('');
  sections.push(arxivMarkdown);

  const markdown = sections.join('\n');

  // Create summary combining both
  const summary = `AI Research Daily podcast + ${arxivReport.featuredCount} featured arXiv papers`;

  return {
    markdown,
    date: reportDate,
    summary
  };
}

/**
 * Generate and store the combined AI Research Daily report
 */
export async function generateAndStoreAiResearchDailyReport(): Promise<void> {
  console.log('Generating AI Research Daily combined report...');

  try {
    // Fetch latest AI Daily episode
    const episode = await getLatestAiDailyEpisode();
    const shortLink = await getAiDailyShortLink(episode, 'ai_research_daily_report');

    // Build combined report
    const report = await buildAiResearchDailyReport(episode, shortLink ?? undefined);

    if (!report) {
      console.error('Failed to build AI Research Daily report');
      return;
    }

    // Store the combined report
    await storeAgentReport({
      agent: 'ai-research-daily',
      date: report.date,
      markdown: report.markdown,
      summary: report.summary
    });

    console.log(`AI Research Daily report stored successfully: ${report.date}`);
  } catch (error) {
    console.error('Failed to generate AI Research Daily report:', error);
    throw error;
  }
}
