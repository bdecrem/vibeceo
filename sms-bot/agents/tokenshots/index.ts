/**
 * Tokenshots Agent - Daily Research Intelligence Podcast
 *
 * Orchestrates the i5 pipeline:
 * 1. Run Python pipeline (ingestion → screening → generation)
 * 2. Read generated markdown report and audio
 * 3. Store to Supabase Storage
 * 4. Return metadata for SMS broadcasting
 */

import { spawn } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import {
  storeAgentReport,
  type StoredReportMetadata,
  getLatestReportMetadata,
} from '../report-storage.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { createShortLink, normalizeShortLinkDomain } from '../../lib/utils/shortlink-service.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import { buildMusicPlayerUrl } from '../../lib/utils/music-player-link.js';
import {
  getAgentSubscribers,
  markAgentReportSent,
} from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';
import { storeSystemAction } from '../../lib/context-loader.js';
import { supabase } from '../../lib/supabase.js';

// ============================================================================
// Configuration
// ============================================================================

const I5_PROJECT_DIR = path.join(process.cwd(), '..', 'incubator', 'i5');
const PIPELINE_SCRIPT = path.join(I5_PROJECT_DIR, 'scripts', 'run_daily.py');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

const TOKENSHOTS_JOB_HOUR = Number(process.env.TOKENSHOTS_REPORT_HOUR || 6);
const TOKENSHOTS_JOB_MINUTE = Number(process.env.TOKENSHOTS_REPORT_MINUTE || 30);

export const TOKENSHOTS_AGENT_SLUG = 'tokenshots';

const AUDIO_BUCKET = 'audio';

// ============================================================================
// Type Definitions
// ============================================================================

interface PipelineResult {
  status: 'success' | 'error';
  date: string;
  papers_ingested?: number;
  stage1_survivors?: number;
  stage2_survivors?: number;
  picks?: string[];
  script_path?: string;
  audio_path?: string;
  error?: string;
}

export interface TokenshotsReportMetadata extends StoredReportMetadata {
  papersIngested: number;
  stage1Survivors: number;
  stage2Survivors: number;
  picks: string[];
  audioUrl?: string;
  audioShortLink?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTodayDate(): string {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pacificNow.getFullYear();
  const month = String(pacificNow.getMonth() + 1).padStart(2, '0');
  const day = String(pacificNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function extractSummary(markdown: string): string {
  const MAX_SUMMARY_LENGTH = 200;

  // Look for executive summary section
  const lines = markdown.split(/\r?\n/);
  const summaryIndex = lines.findIndex((line) =>
    line.trim().toLowerCase().includes('summary') ||
    line.trim().toLowerCase().includes('highlights')
  );

  if (summaryIndex !== -1) {
    const summaryLines: string[] = [];
    for (let i = summaryIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('##') || line.startsWith('---')) {
        break;
      }
      if (line.trim()) {
        summaryLines.push(line.trim());
      }
    }
    const summary = summaryLines.join(' ').slice(0, MAX_SUMMARY_LENGTH);
    if (summary.length > 0) {
      return summary.length < MAX_SUMMARY_LENGTH ? summary : `${summary.slice(0, MAX_SUMMARY_LENGTH - 3)}...`;
    }
  }

  // Fallback: take first few non-empty lines
  const firstParagraph = lines
    .filter((line) => line.trim() && !line.startsWith('#'))
    .slice(0, 3)
    .join(' ')
    .slice(0, MAX_SUMMARY_LENGTH);

  return firstParagraph.length < MAX_SUMMARY_LENGTH
    ? firstParagraph
    : `${firstParagraph.slice(0, MAX_SUMMARY_LENGTH - 3)}...`;
}

function extractPicks(markdown: string): string[] {
  const picks: string[] = [];

  // Look for bullet points with paper titles
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    // Match patterns like "• Title" or "- Title" or "1. Title"
    const match = line.match(/^[\s]*[•\-\d.]+\s*\*?\*?(.+?)\*?\*?\s*$/);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 10 && title.length < 200) {
        picks.push(title);
      }
    }
  }

  return picks.slice(0, 4);
}

// ============================================================================
// Pipeline Execution
// ============================================================================

async function runPythonPipeline(date?: string): Promise<PipelineResult> {
  console.log('🚀 Running Tokenshots pipeline...');

  const args = ['--skip-review']; // Auto-approve for now

  return new Promise((resolve) => {
    const subprocess = spawn(PYTHON_BIN, ['-u', PIPELINE_SCRIPT, ...args], {
      cwd: I5_PROJECT_DIR,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
        VERBOSE: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    subprocess.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    subprocess.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    subprocess.on('error', (error) => {
      resolve({
        status: 'error',
        date: date || getTodayDate(),
        error: `Spawn error: ${error.message}`,
      });
    });

    subprocess.on('close', (exitCode) => {
      if (exitCode !== 0) {
        resolve({
          status: 'error',
          date: date || getTodayDate(),
          error: `Exit code ${exitCode}: ${stderr}`,
        });
        return;
      }

      // Parse the result from stdout (last JSON line)
      const lines = stdout.split(/\r?\n/).filter((line) => line.trim());
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (parsed.status) {
            resolve(parsed as PipelineResult);
            return;
          }
        } catch {
          // Not JSON, continue
        }
      }

      // No JSON found, construct result from output
      resolve({
        status: 'success',
        date: date || getTodayDate(),
      });
    });
  });
}

// ============================================================================
// Audio Upload
// ============================================================================

async function ensureAudioBucketExists(): Promise<void> {
  const { data, error } = await supabase.storage.getBucket(AUDIO_BUCKET);

  if (!error && data) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(AUDIO_BUCKET, {
    public: true,
  });

  if (createError) {
    const status = (createError as { status?: number }).status;
    if (status === 409) {
      return; // Already exists
    }
    throw createError;
  }
}

async function uploadAudio(audioPath: string, date: string): Promise<{ audioUrl: string }> {
  await ensureAudioBucketExists();

  const audioBuffer = await readFile(audioPath);
  const storagePath = `tokenshots/episodes/${date}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    throw new Error('Could not get public URL for uploaded audio');
  }

  return { audioUrl: data.publicUrl };
}

// ============================================================================
// Main Orchestration
// ============================================================================

export async function runAndStoreTokenshotsReport(options?: {
  date?: string;
}): Promise<TokenshotsReportMetadata> {
  const reportDate = options?.date || getTodayDate();
  const startTime = Date.now();

  console.log(`\n=== Tokenshots - ${reportDate} ===\n`);

  try {
    // Run the Python pipeline
    const pipelineResult = await runPythonPipeline(reportDate);

    if (pipelineResult.status === 'error') {
      throw new Error(pipelineResult.error || 'Pipeline failed');
    }

    // Find generated files
    const outputDir = path.join(I5_PROJECT_DIR, 'data', 'output', reportDate);
    const scriptPath = pipelineResult.script_path || path.join(outputDir, 'script.md');
    const audioPath = pipelineResult.audio_path || path.join(outputDir, 'episode.mp3');

    // Check if script exists
    if (!(await fileExists(scriptPath))) {
      throw new Error(`Script not found at ${scriptPath}`);
    }

    // Read the script as markdown report
    const markdown = await readFile(scriptPath, 'utf-8');
    const summary = extractSummary(markdown);
    const picks = pipelineResult.picks || extractPicks(markdown);

    // Store markdown report to Supabase
    const stored = await storeAgentReport({
      agent: TOKENSHOTS_AGENT_SLUG,
      date: reportDate,
      markdown,
      summary,
    });

    console.log(`✓ Report stored: ${stored.reportPath}`);

    // Upload audio if exists
    let audioUrl: string | undefined;
    let audioShortLink: string | undefined;

    if (await fileExists(audioPath)) {
      const { audioUrl: uploadedUrl } = await uploadAudio(audioPath, reportDate);
      audioUrl = uploadedUrl;
      console.log(`✓ Audio uploaded: ${audioUrl}`);

      // Create short link for audio player
      const playerUrl = buildMusicPlayerUrl({
        src: audioUrl,
        title: `Tokenshots - ${formatDateShort(reportDate)}`,
        description: summary,
        autoplay: true,
      });

      try {
        audioShortLink = await createShortLink(playerUrl, {
          context: 'tokenshots-audio',
          createdBy: 'sms-bot',
          createdFor: 'tokenshots-agent',
        });
      } catch (err) {
        console.warn('Failed to create audio short link:', err);
        audioShortLink = playerUrl;
      }
    }

    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    console.log(`\n=== Tokenshots Complete (${durationSeconds}s) ===\n`);

    return {
      ...stored,
      papersIngested: pipelineResult.papers_ingested || 0,
      stage1Survivors: pipelineResult.stage1_survivors || 0,
      stage2Survivors: pipelineResult.stage2_survivors || 0,
      picks,
      audioUrl,
      audioShortLink: audioShortLink ? normalizeShortLinkDomain(audioShortLink) : undefined,
    };
  } catch (error) {
    console.error('❌ Tokenshots failed:', error);
    throw error;
  }
}

function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00');
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(date);
}

// ============================================================================
// Get Latest Report
// ============================================================================

export async function getLatestStoredTokenshotsReport(): Promise<TokenshotsReportMetadata | null> {
  const stored = await getLatestReportMetadata(TOKENSHOTS_AGENT_SLUG);

  if (!stored) {
    return null;
  }

  return {
    ...stored,
    papersIngested: 0,
    stage1Survivors: 0,
    stage2Survivors: 0,
    picks: [],
  };
}

// ============================================================================
// SMS Message Building
// ============================================================================

export async function buildTokenshotsMessage(
  metadata: TokenshotsReportMetadata,
  recipient: string
): Promise<string> {
  // Build viewer URL for report
  const viewerUrl = buildReportViewerUrl({ path: metadata.reportPath });

  // Create short link for report
  let reportShortLink: string;
  try {
    reportShortLink = await createShortLink(viewerUrl, {
      context: 'tokenshots-report',
      createdFor: recipient,
      createdBy: 'sms-bot',
    });
  } catch {
    reportShortLink = viewerUrl;
  }

  const reportLink = normalizeShortLinkDomain(reportShortLink);
  const audioLink = metadata.audioShortLink || null;

  // Build message
  const dateStr = formatDateShort(metadata.date);
  const header = `🎙️ Tokenshots - ${dateStr}`;

  const picksList = metadata.picks.length > 0
    ? metadata.picks.map((p) => `• ${p.length > 50 ? p.slice(0, 47) + '...' : p}`).join('\n')
    : '4 research highlights with venture & scrappy takes';

  const lines = [header, '', picksList, ''];

  if (audioLink) {
    lines.push(`🎧 Listen: ${audioLink}`);
  }
  lines.push(`📄 Report: ${reportLink}`);

  return lines.join('\n');
}

// ============================================================================
// Scheduler Integration
// ============================================================================

export function registerTokenshotsDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'tokenshots-daily',
    hour: TOKENSHOTS_JOB_HOUR,
    minute: TOKENSHOTS_JOB_MINUTE,
    run: async () => {
      console.log('Starting Tokenshots daily job...');

      try {
        // Generate report
        const metadata = await runAndStoreTokenshotsReport();

        // Get subscribers
        const subscribers = await getAgentSubscribers(TOKENSHOTS_AGENT_SLUG);

        if (subscribers.length === 0) {
          console.log('No Tokenshots subscribers, skipping broadcast');
          return;
        }

        console.log(`Broadcasting to ${subscribers.length} Tokenshots subscribers...`);

        // Send to all subscribers with delay
        const delay = Number(process.env.TOKENSHOTS_BROADCAST_DELAY_MS || 150);

        for (const subscriber of subscribers) {
          try {
            const message = await buildTokenshotsMessage(metadata, subscriber.phone_number);

            await twilioClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER!,
              to: subscriber.phone_number,
            });

            // Mark as sent
            await markAgentReportSent(subscriber.phone_number, TOKENSHOTS_AGENT_SLUG);

            // Store message content in conversation context
            await storeSystemAction(subscriber.id, {
              type: 'tokenshots_sent',
              content: message,
              metadata: {
                report_date: metadata.date,
                report_path: metadata.reportPath,
                summary: metadata.summary,
              },
            });

            // Delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, delay));
          } catch (error) {
            console.error(`Failed to send to ${subscriber.phone_number}:`, error);
          }
        }

        console.log('Tokenshots daily broadcast complete');
      } catch (error) {
        console.error('Tokenshots daily job failed:', error);
        throw error;
      }
    },
  });

  console.log(
    `Tokenshots daily job registered for ${TOKENSHOTS_JOB_HOUR}:${String(TOKENSHOTS_JOB_MINUTE).padStart(2, '0')} PT`
  );
}
