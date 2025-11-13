import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getLatestReportMetadata,
  getReportPublicUrl,
  storeAgentReport,
  type StoredReportMetadata,
} from '../report-storage.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { createShortLink, normalizeShortLinkDomain } from '../../lib/utils/shortlink-service.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import {
  getAgentSubscribers,
  markAgentReportSent,
  type AgentSubscriber,
} from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';
import { storeSystemAction } from '../../lib/context-loader.js';
import { getSubscriber } from '../../lib/subscribers.js';
import {
  generateCryptoPodcast,
  lookupCryptoPodcastEpisode,
  type PodcastGenerationResult,
} from './podcast.js';

interface AgentRunResult {
  outputFile: string;
  date: string;
  summary: string;
  markdown: string;
}

interface ParsedAgentOutput {
  status: 'success' | 'error';
  output_file?: string;
  error?: string;
  date?: string;
}

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'data', 'crypto-reports');
const AGENT_SCRIPT = path.join(
  process.cwd(),
  'agents',
  'crypto-research',
  'agent.py'
);
const PYTHON_BIN = process.env.PYTHON_BIN || path.join(process.cwd(), '..', '.venv', 'bin', 'python3');
const CRYPTO_JOB_HOUR = Number(process.env.CRYPTO_REPORT_HOUR || 7);
const CRYPTO_JOB_MINUTE = Number(process.env.CRYPTO_REPORT_MINUTE || 5);
export const CRYPTO_AGENT_SLUG = 'crypto-daily';

async function ensureOutputDirExists(): Promise<string> {
  await mkdir(DEFAULT_OUTPUT_DIR, { recursive: true });
  return DEFAULT_OUTPUT_DIR;
}

function parseAgentJson(stdout: string): ParsedAgentOutput {
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    try {
      const parsed = JSON.parse(line) as ParsedAgentOutput;
      if (parsed.status === 'success' || parsed.status === 'error') {
        return parsed;
      }
    } catch {
      // Ignore lines that are not JSON payloads
    }
  }

  return { status: 'error', error: 'no_json_output' };
}

function extractExecutiveSummary(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().toLowerCase().startsWith('## executive summary')
  );

  if (headerIndex === -1) {
    const firstParagraph = lines.slice(0, 8).join('\n').trim();
    return firstParagraph.length > 0 ? firstParagraph : markdown.slice(0, 320);
  }

  const summaryLines: string[] = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('##') || line.startsWith('---')) {
      break;
    }
    summaryLines.push(line);
  }

  const summary = summaryLines.join('\n').trim();
  return summary.length > 0 ? summary : 'Executive summary not found in report.';
}

async function verifyPythonEnvironment(): Promise<void> {
  const checkScript = [
    "import importlib.util",
    "import sys",
    "spec = importlib.util.find_spec('claude_agent_sdk')",
    "sys.exit(0 if spec else 3)",
  ].join('\n');

  const args = ['-c', checkScript];

  const subprocess = spawn(PYTHON_BIN, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'ignore', 'ignore'],
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    subprocess.on('error', reject);
    subprocess.on('close', resolve);
  });

  if (exitCode === 3) {
    throw new Error('missing_claude_agent_sdk');
  }

  if (exitCode !== 0) {
    throw new Error(`python_environment_check_failed:${exitCode}`);
  }
}

async function runPythonAgent(date?: string): Promise<AgentRunResult> {
  await verifyPythonEnvironment();
  const outputDir = await ensureOutputDirExists();
  const args = [AGENT_SCRIPT, '--output-dir', outputDir];

  if (date) {
    args.push('--date', date);
  }

  // Create environment for Python agent
  // Use ANTHROPIC_API_KEY (not OAuth) for authentication
  const agentEnv = {
    ...process.env,
    ANTHROPIC_API_KEY: process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.ANTHROPIC_API_KEY,
    // Remove any OAuth tokens to force API key usage
    CLAUDE_CODE_OAUTH_TOKEN: undefined,
  };

  const subprocess = spawn(PYTHON_BIN, args, {
    cwd: process.cwd(),
    env: agentEnv,
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
      `crypto agent exited with code ${exitCode}: ${stderr || stdout || 'no output'}`
    );
  }

  const payload = parseAgentJson(stdout);

  if (payload.status !== 'success' || !payload.output_file || !payload.date) {
    throw new Error(
      `crypto agent returned invalid payload: ${stdout.trim()}`
    );
  }

  const reportContent = await readFile(payload.output_file, 'utf-8');
  const summaryBody = extractExecutiveSummary(reportContent);

  const clippedSummary = summaryBody.length > 600
    ? `${summaryBody.slice(0, 600).trim()}…`
    : summaryBody;

  const summary = clippedSummary.trim();

  return {
    outputFile: payload.output_file,
    date: payload.date,
    summary,
    markdown: reportContent,
  };
}

export const cryptoResearchAgent = {
  async run(options: { date?: string } = {}): Promise<AgentRunResult> {
    return runPythonAgent(options.date);
  },
};

export interface CryptoReportWithPodcast extends StoredReportMetadata {
  podcast?: PodcastGenerationResult | null;
  reportShortLink?: string | null;
}

export async function runAndStoreCryptoReport(
  options: { date?: string; forcePodcast?: boolean } = {}
): Promise<CryptoReportWithPodcast> {
  const result = await cryptoResearchAgent.run(options);

  const stored = await storeAgentReport({
    agent: 'crypto-research',
    date: result.date,
    markdown: result.markdown,
    summary: result.summary,
  });

  let podcast: PodcastGenerationResult | null = null;
  let reportShortLink: string | null = null;

  if (stored.publicUrl) {
    try {
      reportShortLink = await createShortLink(stored.publicUrl, {
        context: 'crypto-report',
        createdBy: 'sms-bot',
        createdFor: 'podcast',
      });
    } catch (error) {
      console.warn('Failed to create short link for crypto report:', error);
    }
  }

  try {
    podcast = await generateCryptoPodcast({
      date: result.date,
      markdown: result.markdown,
      summary: result.summary,
      reportUrl: stored.publicUrl ?? null,
      reportShortLink,
      forceRegenerate: options.forcePodcast,
    });
    if (podcast?.shortLink) {
      podcast = {
        ...podcast,
        shortLink: normalizeShortLinkDomain(podcast.shortLink),
      };
    }
  } catch (error) {
    console.error('Crypto podcast generation failed:', error);
  }

  return {
    ...stored,
    publicUrl: stored.publicUrl ?? null,
    reportShortLink,
    podcast,
  };
}

export async function getLatestStoredCryptoReport(): Promise<
  (CryptoReportWithPodcast & { publicUrl: string | null }) | null
> {
  const metadata = await getLatestReportMetadata('crypto-research');

  if (!metadata) {
    return null;
  }

  const publicUrl =
    metadata.publicUrl ?? (await getReportPublicUrl(metadata.reportPath));

  let podcast: PodcastGenerationResult | null = null;
  let reportShortLink: string | null = null;
  try {
    podcast = await lookupCryptoPodcastEpisode(metadata.date);
    if (podcast?.shortLink) {
      podcast = {
        ...podcast,
        shortLink: normalizeShortLinkDomain(podcast.shortLink),
      };
    }
  } catch (error) {
    console.error('Failed to load existing crypto podcast episode:', error);
  }

  const base = {
    ...metadata,
    publicUrl: publicUrl ?? null,
    podcast,
  } as CryptoReportWithPodcast & { publicUrl: string | null };

  if (podcast?.reportLink) {
    reportShortLink = podcast.reportLink;
  }

  return {
    ...base,
    reportShortLink,
  };
}

export function registerCryptoDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'crypto-research-report',
    hour: CRYPTO_JOB_HOUR,
    minute: CRYPTO_JOB_MINUTE,
    timezone: 'America/Los_Angeles',
    run: async () => {
      console.log('Running scheduled crypto research report...');
      try {
        const metadata = await runAndStoreCryptoReport();
        console.log(
          `✅ Crypto research report stored for ${metadata.date} at ${metadata.reportPath}`
        );

        await broadcastCryptoReport(metadata, twilioClient);
      } catch (error) {
        console.error('❌ Scheduled crypto research report failed:', error);
      }
    },
  });
}

export async function buildCryptoReportMessage(
  summary: string | null | undefined,
  isoDate: string,
  reportPathOrUrl: string | null | undefined,
  recipient: string,
  options: { podcastLink?: string | null } = {}
): Promise<string> {
  const headline = formatHeadline(isoDate);
  const summaryLine = formatSummary(summary);
  const link = await resolveLink(reportPathOrUrl, recipient);
  const podcastLink = options.podcastLink
    ? normalizeShortLinkDomain(options.podcastLink)
    : null;

  const lines = [`${headline} — ${summaryLine}`];

  if (podcastLink) {
    lines.push(`🎧 Listen: ${podcastLink}`);
  }

  if (link) {
    if (podcastLink) {
      lines.push(`📄 Full report: ${link}`);
    } else {
      lines.push(`🔗 ${link}`);
    }
  }

  return lines.join('\n');
}

function parseIsoDateForPacificMidday(isoDate: string): Date | null {
  const parts = isoDate.split('-').map(Number);

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatHeadline(isoDate: string): string {
  const parsed = parseIsoDateForPacificMidday(isoDate) ?? new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return '🪙 Crypto report';
  }

  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(parsed);

  return `🪙 Crypto report ${formatted}`;
}

function formatSummary(summary?: string | null): string {
  if (!summary) {
    return 'Full report available.';
  }

  const cleaned = summary.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'Full report available.';
  }

  const match = cleaned.match(/[^.!?]+[.!?]/);
  const sentence = match ? match[0] : cleaned;

  return sentence.trim();
}

async function resolveLink(reportPath: string | null | undefined, recipient: string): Promise<string | null> {
  if (!reportPath) {
    return null;
  }

  // Build report viewer URL from the storage path
  // reportPath is like "crypto-research/reports/2025-10-06.md"
  const viewerUrl = buildReportViewerUrl({ path: reportPath });

  try {
    const short = await createShortLink(viewerUrl, {
      context: 'crypto-report-viewer',
      createdFor: recipient,
      createdBy: 'sms-bot',
    });

    return short || viewerUrl;
  } catch (error) {
    console.warn('Failed to shorten crypto report viewer link:', error);
    return viewerUrl;
  }
}

const BROADCAST_DELAY_MS = Number(process.env.CRYPTO_BROADCAST_DELAY_MS || 150);
const AUTOMATED_DEDUP_WINDOW_MS = 20 * 60 * 60 * 1000; // 20 hours

async function broadcastCryptoReport(
  metadata: CryptoReportWithPodcast,
  twilioClient: TwilioClient
): Promise<void> {
  try {
    const subscribers = await getAgentSubscribers(CRYPTO_AGENT_SLUG);

    if (!subscribers.length) {
      console.log('Crypto broadcast: no active subscribers.');
      return;
    }

    const now = Date.now();
    let skipped = 0;
    let sent = 0;

    console.log(`Crypto broadcast: evaluating ${subscribers.length} subscriber(s).`);

    for (const subscriber of subscribers) {
      try {
        if (shouldSkipAutomatedDelivery(subscriber, now)) {
          skipped += 1;
          console.log(
            `Crypto broadcast: skipping ${subscriber.phone_number} (last sent at ${subscriber.last_sent_at ?? 'never'})`
          );
          continue;
        }

        const message = await buildCryptoReportMessage(
          metadata.summary,
          metadata.date,
          metadata.reportPath, // Pass the storage path for report viewer
          subscriber.phone_number,
          {
            podcastLink:
              metadata.podcast?.shortLink ?? metadata.podcast?.audioUrl ?? null,
          }
        );

        await twilioClient.messages.create({
          body: message,
          to: subscriber.phone_number,
          from: process.env.TWILIO_PHONE_NUMBER,
        });

        await markAgentReportSent(subscriber.phone_number, CRYPTO_AGENT_SLUG);

        // Store message content in conversation context
        await storeSystemAction(subscriber.id, {
          type: 'crypto_daily_sent',
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
          `Error sending crypto report to ${subscriber.phone_number}:`,
          error
        );
      }
    }

    console.log(
      `Crypto broadcast: sent to ${sent} subscriber(s), skipped ${skipped} due to dedupe window.`
    );
  } catch (error) {
    console.error('Crypto broadcast failed:', error);
  }
}

function shouldSkipAutomatedDelivery(subscriber: AgentSubscriber, now: number): boolean {
  if (!subscriber.last_sent_at) {
    return false;
  }

  const lastSent = Date.parse(subscriber.last_sent_at);
  if (Number.isNaN(lastSent)) {
    return false;
  }

  return now - lastSent < AUTOMATED_DEDUP_WINDOW_MS;
}
