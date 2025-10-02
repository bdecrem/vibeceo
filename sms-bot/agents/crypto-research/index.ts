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
import { createShortLink } from '../../lib/utils/shortlink-service.js';
import { getAgentSubscribers, markAgentReportSent } from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';

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
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
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

export async function runAndStoreCryptoReport(
  options: { date?: string } = {}
): Promise<StoredReportMetadata> {
  const result = await cryptoResearchAgent.run(options);

  return storeAgentReport({
    agent: 'crypto-research',
    date: result.date,
    markdown: result.markdown,
    summary: result.summary,
  });
}

export async function getLatestStoredCryptoReport(): Promise<
  (StoredReportMetadata & { publicUrl: string | null }) | null
> {
  const metadata = await getLatestReportMetadata('crypto-research');

  if (!metadata) {
    return null;
  }

  const publicUrl =
    metadata.publicUrl ?? (await getReportPublicUrl(metadata.reportPath));

  return {
    ...metadata,
    publicUrl: publicUrl ?? null,
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
  publicUrl: string | null | undefined,
  recipient: string
): Promise<string> {
  const headline = formatHeadline(isoDate);
  const summaryLine = formatSummary(summary);
  const link = await resolveLink(publicUrl, recipient);

  return link ? `${headline} — ${summaryLine}\n🔗 ${link}` : `${headline} — ${summaryLine}`;
}

function formatHeadline(isoDate: string): string {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return '✅ Crypto report';
  }

  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(parsed);

  return `✅ Crypto report ${formatted}`;
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

async function resolveLink(publicUrl: string | null | undefined, recipient: string): Promise<string | null> {
  if (!publicUrl) {
    return null;
  }

  try {
    const short = await createShortLink(publicUrl, {
      context: 'crypto-report',
      createdFor: recipient,
      createdBy: 'sms-bot',
    });

    return short || publicUrl;
  } catch (error) {
    console.warn('Failed to shorten crypto report link:', error);
    return publicUrl;
  }
}

const BROADCAST_DELAY_MS = Number(process.env.CRYPTO_BROADCAST_DELAY_MS || 150);

async function broadcastCryptoReport(
  metadata: StoredReportMetadata,
  twilioClient: TwilioClient
): Promise<void> {
  try {
    const subscribers = await getAgentSubscribers(CRYPTO_AGENT_SLUG);

    if (!subscribers.length) {
      console.log('Crypto broadcast: no active subscribers.');
      return;
    }

    console.log(`Crypto broadcast: sending to ${subscribers.length} subscriber(s).`);

    for (const subscriber of subscribers) {
      try {
        const message = await buildCryptoReportMessage(
          metadata.summary,
          metadata.date,
          metadata.publicUrl,
          subscriber.phone_number
        );

        await twilioClient.messages.create({
          body: message,
          to: subscriber.phone_number,
          from: process.env.TWILIO_PHONE_NUMBER,
        });

        await markAgentReportSent(subscriber.phone_number, CRYPTO_AGENT_SLUG);

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
  } catch (error) {
    console.error('Crypto broadcast failed:', error);
  }
}
