import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  getLatestReportMetadata,
  storeAgentReport,
  type StoredReportMetadata,
} from '../report-storage.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';
import { buildMusicPlayerUrl } from '../../lib/utils/music-player-link.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import {
  getAgentSubscribers,
  markAgentReportSent,
  type AgentSubscriber,
} from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';
import { supabase } from '../../lib/supabase.js';
import { storeSystemAction } from '../../lib/context-loader.js';

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'data', 'medical-daily');
const AGENT_SCRIPT = path.join(process.cwd(), 'agents', 'medical-daily', 'agent.py');
const PYTHON_BIN =
  process.env.MEDICAL_DAILY_PYTHON_BIN || process.env.PYTHON_BIN || 'python3';

export const MEDICAL_AGENT_SLUG = 'medical-daily';

const JOB_HOUR = parseNumber(process.env.MEDICAL_DAILY_REPORT_HOUR, 6);
const JOB_MINUTE = parseNumber(process.env.MEDICAL_DAILY_REPORT_MINUTE, 45);
const BROADCAST_DELAY_MS = parseNumber(
  process.env.MEDICAL_DAILY_BROADCAST_DELAY_MS,
  150
);
const DEDUP_WINDOW_MS = parseNumber(
  process.env.MEDICAL_DAILY_DEDUP_WINDOW_MS,
  20 * 60 * 60 * 1000
);
const DETAILS_PREFIX = `${MEDICAL_AGENT_SLUG}/details`;
const DETAILS_BUCKET = process.env.AGENT_REPORTS_BUCKET || 'agent-reports';

interface PythonAgentPayload {
  status: 'success' | 'error';
  output_file?: string;
  details_file?: string;
  date?: string;
  summary?: string;
  headline?: string;
  daily_intro?: string;
  audio_url?: string | null;
  audio_page_url?: string | null;
  article_count?: number;
  error?: string;
}

export interface MedicalDailyArticle {
  title?: string;
  url?: string;
  journal?: string;
  source?: string;
  date?: string;
  podcast_summary?: string;
  detail_summary?: string;
  summary?: string;
  description?: string;
}

export interface MedicalDailyDetails {
  date?: string;
  service_date?: string;
  headline?: string;
  summary?: string;
  daily_intro?: string;
  audio_url?: string | null;
  audio_page_url?: string | null;
  audio_short_link?: string | null;
  report_short_link?: string | null;
  article_count?: number;
  articles?: MedicalDailyArticle[];
  script?: string;
}

export interface MedicalDailyReport extends StoredReportMetadata {
  reportShortLink?: string | null;
  audioShortLink?: string | null;
  audioUrl?: string | null;
  audioPageUrl?: string | null;
  headline?: string | null;
  dailyIntro?: string | null;
  detailsPath?: string | null;
  details?: MedicalDailyDetails;
}

async function ensureOutputDirExists(): Promise<string> {
  await mkdir(DEFAULT_OUTPUT_DIR, { recursive: true });
  return DEFAULT_OUTPUT_DIR;
}

function parseAgentPayload(stdout: string): PythonAgentPayload {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    try {
      const parsed = JSON.parse(line) as PythonAgentPayload;
      if (parsed.status === 'success' || parsed.status === 'error') {
        return parsed;
      }
    } catch {
      // ignore non-JSON lines
    }
  }

  return { status: 'error', error: 'no_json_output' };
}

interface AgentRunResult {
  date: string;
  outputFile: string;
  detailsFile: string;
  summary?: string;
  headline?: string;
  dailyIntro?: string;
  audioUrl?: string | null;
  audioPageUrl?: string | null;
  articleCount?: number;
}

async function runPythonAgent(): Promise<AgentRunResult> {
  const outputDir = await ensureOutputDirExists();
  const cacheDir = path.join(outputDir, 'cache');
  await mkdir(cacheDir, { recursive: true });

  const args = [
    AGENT_SCRIPT,
    '--output-dir',
    outputDir,
    '--cache-dir',
    cacheDir,
  ];

  const subprocess = spawn(PYTHON_BIN, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  subprocess.stdout.setEncoding('utf-8');
  subprocess.stdout.on('data', (chunk) => {
    stdout += chunk;
  });

  subprocess.stderr.setEncoding('utf-8');
  subprocess.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    subprocess.on('error', reject);
    subprocess.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(
      `medical daily agent exited with code ${exitCode}: ${stderr || stdout || 'no output'}`
    );
  }

  const payload = parseAgentPayload(stdout);

  if (
    payload.status !== 'success' ||
    !payload.output_file ||
    !payload.details_file ||
    !payload.date
  ) {
    throw new Error(`medical daily agent returned invalid payload: ${stdout.trim()}`);
  }

  return {
    date: payload.date,
    outputFile: payload.output_file,
    detailsFile: payload.details_file,
    summary: payload.summary,
    headline: payload.headline,
    dailyIntro: payload.daily_intro,
    audioUrl: payload.audio_url ?? null,
    audioPageUrl: payload.audio_page_url ?? null,
    articleCount: payload.article_count,
  };
}

async function readDetailsFile(detailsPath: string): Promise<MedicalDailyDetails> {
  const raw = await readFile(detailsPath, 'utf-8');
  try {
    const parsed = JSON.parse(raw) as MedicalDailyDetails;
    if (!Array.isArray(parsed.articles)) {
      parsed.articles = [];
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse medical daily details JSON:', error);
    return {
      articles: [],
    };
  }
}

async function storeMedicalDailyDetails(
  details: MedicalDailyDetails,
  date: string
): Promise<string | null> {
  const objectPath = `${DETAILS_PREFIX}/${date}.json`;

  const { error } = await supabase.storage.from(DETAILS_BUCKET).upload(
    objectPath,
    Buffer.from(JSON.stringify(details, null, 2), 'utf-8'),
    {
      contentType: 'application/json',
      upsert: true,
    }
  );

  if (error) {
    console.error('Failed to upload medical daily details:', error);
    return null;
  }

  return objectPath;
}

async function loadMedicalDailyDetailsFromStorage(
  date: string
): Promise<MedicalDailyDetails | null> {
  const objectPath = `${DETAILS_PREFIX}/${date}.json`;
  const { data, error } = await supabase.storage
    .from(DETAILS_BUCKET)
    .download(objectPath);

  if (error || !data) {
    return null;
  }

  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as MedicalDailyDetails;
    if (!Array.isArray(parsed.articles)) {
      parsed.articles = [];
    }
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse stored medical daily details:', parseError);
    return null;
  }
}

function isLikelyShortLink(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  return /b52s\.me/i.test(url);
}

function normalizeHttpUrl(candidate: string | null | undefined): string | null {
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

async function ensureShortLink(
  url: string | null | undefined,
  context: string,
  recipient: string
): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (isLikelyShortLink(url)) {
    return url;
  }

  try {
    const short = await createShortLink(url, {
      context,
      createdFor: recipient,
      createdBy: 'sms-bot',
    });
    return short || url;
  } catch (error) {
    console.warn(`Failed to shorten link for ${context}:`, error);
    return url;
  }
}

function selectAudioLink(
  details: MedicalDailyDetails | undefined,
  fallback?: string | null
): string | null {
  if (details?.audio_short_link) {
    return details.audio_short_link;
  }

  if (details?.audio_page_url) {
    return details.audio_page_url;
  }

  if (details?.audio_url) {
    return details.audio_url;
  }

  return fallback ?? null;
}

function normalizeSummary(summary?: string | null): string {
  if (!summary) {
    return 'Full briefing available.';
  }

  const cleaned = summary.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'Full briefing available.';
  }

  if (cleaned.length <= 240) {
    return cleaned;
  }

  const sentenceMatch = cleaned.match(/[^.!?]+[.!?]/);
  if (sentenceMatch) {
    return sentenceMatch[0].trim();
  }

  return `${cleaned.slice(0, 220).trim()}...`;
}

function formatHeadline(date: string, headline?: string | null): string {
  const icon = '🩺';
  let formattedDate = '';

  if (date) {
    const [year, month, day] = date.split('-').map((value) => Number.parseInt(value, 10));
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day)
    ) {
      const parsed = new Date(year, month - 1, day);
      if (!Number.isNaN(parsed.getTime())) {
        formattedDate = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'America/Los_Angeles',
        }).format(parsed);
      }
    }
  }

  const base = formattedDate
    ? `${icon} Medical Daily ${formattedDate}`
    : `${icon} Medical Daily`;

  if (headline && headline.trim()) {
    return `${base} - ${headline.trim()}`;
  }

  return base;
}
export async function runAndStoreMedicalDailyReport(): Promise<MedicalDailyReport> {
  const result = await runPythonAgent();
  const markdown = await readFile(result.outputFile, 'utf-8');
  const details = await readDetailsFile(result.detailsFile);

  const summary = normalizeSummary(result.summary ?? details.summary ?? markdown.slice(0, 240));

  const stored = await storeAgentReport({
    agent: MEDICAL_AGENT_SLUG,
    date: result.date,
    markdown,
    summary,
  });

  let reportShortLink: string | null = null;
  if (stored.reportPath) {
    // Build report viewer URL from storage path
    const viewerUrl = buildReportViewerUrl({ path: stored.reportPath });
    try {
      reportShortLink = await createShortLink(viewerUrl, {
        context: 'medical-daily-report',
        createdBy: 'sms-bot',
        createdFor: 'medical-daily',
      });
    } catch (error) {
      console.warn('Failed to create Medical Daily report viewer short link:', error);
      // Fallback to viewer URL without shortening
      reportShortLink = viewerUrl;
    }
  }

  const rawAudioPageUrl = details.audio_page_url ?? result.audioPageUrl ?? null;
  const rawAudioUrl = details.audio_url ?? result.audioUrl ?? null;
  const normalizedAudioPageUrl = normalizeHttpUrl(rawAudioPageUrl);
  const normalizedAudioUrl = normalizeHttpUrl(rawAudioUrl);
  const audioCandidate = normalizedAudioPageUrl ?? normalizedAudioUrl ?? null;

  let audioShortLink: string | null = null;
  if (audioCandidate) {
    // Build music player URL from audio source
    const playerUrl = buildMusicPlayerUrl({
      src: audioCandidate,
      title: `Medical Daily ${result.date}`,
      description: summary,
      autoplay: true,
    });

    try {
      audioShortLink = await createShortLink(playerUrl, {
        context: 'medical-daily-audio',
        createdBy: 'sms-bot',
        createdFor: 'medical-daily',
      });
    } catch (error) {
      console.warn('Failed to create Medical Daily player short link:', error);
      // Fallback to player URL without shortening
      audioShortLink = playerUrl;
    }
  }

  details.summary = details.summary ?? summary;
  details.headline = details.headline ?? result.headline ?? undefined;
  details.daily_intro = details.daily_intro ?? result.dailyIntro ?? undefined;
  if (normalizedAudioPageUrl) {
    details.audio_page_url = normalizedAudioPageUrl;
  } else if (!details.audio_page_url && rawAudioPageUrl) {
    details.audio_page_url = rawAudioPageUrl;
  }
  if (normalizedAudioUrl) {
    details.audio_url = normalizedAudioUrl;
  } else if (!details.audio_url && rawAudioUrl) {
    details.audio_url = rawAudioUrl;
  } else if (!normalizedAudioUrl && !rawAudioUrl) {
    details.audio_url = null;
  }
  if (reportShortLink) {
    details.report_short_link = reportShortLink;
  }
  if (audioShortLink) {
    details.audio_short_link = audioShortLink;
  }

  const detailsPath = await storeMedicalDailyDetails(details, result.date);

  return {
    ...stored,
    summary,
    publicUrl: stored.publicUrl ?? null,
    reportShortLink,
    audioShortLink,
    audioUrl: normalizedAudioUrl ?? rawAudioUrl ?? null,
    audioPageUrl: normalizedAudioPageUrl ?? rawAudioPageUrl ?? null,
    headline: details.headline ?? null,
    dailyIntro: details.daily_intro ?? null,
    detailsPath: detailsPath ?? null,
    details,
  };
}

export async function getLatestStoredMedicalReport(): Promise<MedicalDailyReport | null> {
  const stored = await getLatestReportMetadata(MEDICAL_AGENT_SLUG);
  if (!stored) {
    return null;
  }

  const details =
    (await loadMedicalDailyDetailsFromStorage(stored.date)) || undefined;

  const normalizedDetailsAudioPage = normalizeHttpUrl(details?.audio_page_url ?? undefined);
  const normalizedDetailsAudio = normalizeHttpUrl(details?.audio_url ?? undefined);

  if (details) {
    if (normalizedDetailsAudioPage) {
      details.audio_page_url = normalizedDetailsAudioPage;
    }
    if (normalizedDetailsAudio) {
      details.audio_url = normalizedDetailsAudio;
    }
  }

  let reportShortLink = details?.report_short_link ?? null;
  if (!reportShortLink && stored.reportPath) {
    // Build report viewer URL from storage path
    const viewerUrl = buildReportViewerUrl({ path: stored.reportPath });
    try {
      reportShortLink = await createShortLink(viewerUrl, {
        context: 'medical-daily-report',
        createdBy: 'sms-bot',
        createdFor: 'medical-daily',
      });
    } catch (error) {
      console.warn('Failed to create Medical Daily report viewer short link:', error);
      // Fallback to viewer URL without shortening
      reportShortLink = viewerUrl;
    }
  }

  const audioCandidate = selectAudioLink(details, null);
  let audioShortLink = details?.audio_short_link ?? null;
  if (!audioShortLink && audioCandidate) {
    // Build music player URL from audio source
    const playerUrl = buildMusicPlayerUrl({
      src: audioCandidate,
      title: `Medical Daily ${stored.date}`,
      description: stored.summary || 'Daily medical research briefing',
      autoplay: true,
    });

    try {
      audioShortLink = await createShortLink(playerUrl, {
        context: 'medical-daily-audio',
        createdBy: 'sms-bot',
        createdFor: 'medical-daily',
      });
    } catch (error) {
      console.warn('Failed to create Medical Daily player short link:', error);
      // Fallback to player URL without shortening
      audioShortLink = playerUrl;
    }
  }

  return {
    ...stored,
    publicUrl: stored.publicUrl ?? null,
    summary: stored.summary,
    reportShortLink,
    audioShortLink,
    audioUrl: normalizedDetailsAudio ?? details?.audio_url ?? null,
    audioPageUrl: normalizedDetailsAudioPage ?? details?.audio_page_url ?? null,
    headline: details?.headline ?? null,
    dailyIntro: details?.daily_intro ?? null,
    detailsPath: `${DETAILS_PREFIX}/${stored.date}.json`,
    details,
  };
}

export async function buildMedicalDailyMessage(
  metadata: MedicalDailyReport,
  recipient: string
): Promise<string> {
  const details = metadata.details;
  const headline = formatHeadline(metadata.date, metadata.headline ?? details?.headline ?? null);
  const summary = normalizeSummary(
    metadata.summary ?? details?.summary ?? null
  );

  let audioLink = metadata.audioShortLink ?? details?.audio_short_link ?? null;
  if (!audioLink) {
    const candidate = selectAudioLink(details, metadata.audioPageUrl ?? metadata.audioUrl ?? null);
    audioLink = await ensureShortLink(candidate, 'medical-daily-audio', recipient);
  }

  let reportLink = metadata.reportShortLink ?? details?.report_short_link ?? metadata.publicUrl ?? null;
  if (!reportLink) {
    reportLink = await ensureShortLink(
      metadata.publicUrl,
      'medical-daily-report',
      recipient
    );
  }

  const lines: string[] = [`${headline} - ${summary}`];

  if (audioLink) {
    lines.push(`🎧 Listen: ${audioLink}`);
  }

  if (reportLink) {
    lines.push(`📄 Full briefing: ${reportLink}`);
  }

  lines.push('Reply MD LINKS for sources.');

  return lines.join('\n');
}

function shouldSkipAutomatedDelivery(subscriber: AgentSubscriber, now: number): boolean {
  if (!subscriber.last_sent_at) {
    return false;
  }

  const lastSent = Date.parse(subscriber.last_sent_at);
  if (Number.isNaN(lastSent)) {
    return false;
  }

  return now - lastSent < DEDUP_WINDOW_MS;
}

async function broadcastMedicalDailyReport(
  metadata: MedicalDailyReport,
  twilioClient: TwilioClient
): Promise<void> {
  try {
    const subscribers = await getAgentSubscribers(MEDICAL_AGENT_SLUG);

    if (!subscribers.length) {
      console.log('Medical Daily broadcast: no active subscribers.');
      return;
    }

    const now = Date.now();
    let sent = 0;
    let skipped = 0;

    for (const subscriber of subscribers) {
      try {
        if (shouldSkipAutomatedDelivery(subscriber, now)) {
          skipped += 1;
          continue;
        }

        const message = await buildMedicalDailyMessage(metadata, subscriber.phone_number);
        await twilioClient.messages.create({
          body: message,
          to: subscriber.phone_number,
          from: process.env.TWILIO_PHONE_NUMBER,
        });

        await markAgentReportSent(subscriber.phone_number, MEDICAL_AGENT_SLUG);

        // Store message content in conversation context
        await storeSystemAction(subscriber.id, {
          type: 'medical_daily_sent',
          content: message,
          metadata: {
            report_date: metadata.date,
            report_path: metadata.reportPath,
            summary: metadata.summary,
          },
        });

        sent += 1;

        if (BROADCAST_DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, BROADCAST_DELAY_MS));
        }
      } catch (error) {
        console.error(
          `Error sending Medical Daily report to ${subscriber.phone_number}:`,
          error
        );
      }
    }

    console.log(
      `Medical Daily broadcast complete: sent=${sent}, skipped=${skipped}.`
    );
  } catch (error) {
    console.error('Medical Daily broadcast failed:', error);
  }
}

export function registerMedicalDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'medical-daily-report',
    hour: JOB_HOUR,
    minute: JOB_MINUTE,
    timezone: 'America/Los_Angeles',
    run: async () => {
      console.log('Running scheduled Medical Daily report...');
      try {
        const metadata = await runAndStoreMedicalDailyReport();
        console.log(
          `Medical Daily report stored for ${metadata.date} at ${metadata.reportPath}`
        );
        await broadcastMedicalDailyReport(metadata, twilioClient);
      } catch (error) {
        console.error('Medical Daily job failed:', error);
      }
    },
  });
}

