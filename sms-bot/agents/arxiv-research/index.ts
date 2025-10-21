/**
 * arXiv Research Agent - TypeScript Wrapper
 *
 * Orchestrates the two-stage process:
 * 1. Fetch ALL AI/ML papers from arXiv (Python script)
 * 2. Curate top 5-10 papers and generate report (Claude Agent SDK)
 * 3. Store everything in database with author tracking
 * 4. Upload report to Supabase Storage
 * 5. Return metadata for SMS/scheduling
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  storeAgentReport,
  type StoredReportMetadata,
  getLatestReportMetadata,
} from '../report-storage.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import {
  getAgentSubscribers,
  markAgentReportSent,
  type AgentSubscriber,
} from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';
import * as db from './database.js';
import { generateArxivPodcast, type PodcastGenerationResult } from './podcast.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data', 'arxiv-reports');
const FETCH_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research', 'fetch_papers.py');
const AGENT_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research', 'agent.py');
const PYTHON_BIN = process.env.PYTHON_BIN || path.join(process.cwd(), '..', '.venv', 'bin', 'python3');

const ARXIV_JOB_HOUR = Number(process.env.ARXIV_REPORT_HOUR || 6);
const ARXIV_JOB_MINUTE = Number(process.env.ARXIV_REPORT_MINUTE || 0);
const ARXIV_MAX_PAPERS = Number(process.env.ARXIV_MAX_PAPERS || 1000);

export const ARXIV_AGENT_SLUG = 'arxiv-daily';

// ============================================================================
// Type Definitions
// ============================================================================

interface FetchResult {
  status: 'success' | 'error';
  output_file?: string;
  papers_count?: number;
  date?: string;
  error?: string;
}

interface CurationResult {
  status: 'success' | 'error';
  output_markdown?: string;
  output_json?: string;
  featured_count?: number;
  date?: string;
  error?: string;
}

interface CurationData {
  date: string;
  total_papers: number;
  featured_count: number;
  featured_papers: Array<{
    arxiv_id: string;
    title: string;
    featured_rank: number;
    curation_reason: string;
    star_rating?: number;
  }>;
  notable_authors?: Array<{
    name: string;
    paper_count_today: number;
    featured_papers: string[];
  }>;
}

interface PaperData {
  arxiv_id: string;
  title: string;
  abstract: string;
  authors: Array<{
    name: string;
    affiliation?: string | null;
  }>;
  categories: string[];
  published_date: string;
  arxiv_url: string;
  pdf_url: string;
}

interface FetchedData {
  fetch_date: string;
  target_date: string;
  total_papers: number;
  categories: string[];
  papers: PaperData[];
}

export interface ArxivReportMetadata extends StoredReportMetadata {
  totalPapers: number;
  featuredCount: number;
  notableAuthorsCount: number;
  podcast?: PodcastGenerationResult;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function ensureDataDirExists(): Promise<string> {
  await mkdir(DEFAULT_DATA_DIR, { recursive: true });
  return DEFAULT_DATA_DIR;
}

function parseJsonOutput(stdout: string): FetchResult | CurationResult {
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);

  // Find last JSON line
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    try {
      const parsed = JSON.parse(line);
      if (parsed.status === 'success' || parsed.status === 'error') {
        return parsed;
      }
    } catch {
      // Ignore non-JSON lines
    }
  }

  return { status: 'error', error: 'no_json_output' };
}

function extractExecutiveSummary(markdown: string): string {
  const MAX_SMS_SUMMARY_LENGTH = 200; // Keep it short to fit in single SMS with links

  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().toLowerCase().startsWith('## executive summary')
  );

  if (headerIndex === -1) {
    // Fallback: take first few non-empty lines
    const firstParagraph = lines.slice(0, 10).join('\n').trim();
    const fallback = firstParagraph.length > 0 ? firstParagraph : markdown.slice(0, 320);
    return fallback.length > MAX_SMS_SUMMARY_LENGTH
      ? fallback.slice(0, MAX_SMS_SUMMARY_LENGTH - 3) + '...'
      : fallback;
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
  if (summary.length === 0) {
    return 'Executive summary not found in report.';
  }

  // Truncate if too long to keep SMS as single message
  return summary.length > MAX_SMS_SUMMARY_LENGTH
    ? summary.slice(0, MAX_SMS_SUMMARY_LENGTH - 3) + '...'
    : summary;
}

async function runPythonScript(
  scriptPath: string,
  args: string[],
  description: string
): Promise<string> {
  console.log(`Running ${description}...`);

  const subprocess = spawn(PYTHON_BIN, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.ANTHROPIC_API_KEY,
      CLAUDE_CODE_OAUTH_TOKEN: undefined, // Force API key usage
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  subprocess.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  subprocess.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    subprocess.on('error', reject);
    subprocess.on('close', resolve);
  });

  if (exitCode !== 0) {
    console.error(`${description} failed with exit code ${exitCode}`);
    console.error('STDERR:', stderr);
    throw new Error(`${description} failed: exit code ${exitCode}`);
  }

  return stdout;
}

// ============================================================================
// Stage 1: Fetch Papers
// ============================================================================

async function fetchPapersStage(date?: string): Promise<{ jsonPath: string; papers: PaperData[] }> {
  const dataDir = await ensureDataDirExists();
  const args = ['--output-dir', dataDir];

  if (date) {
    args.push('--date', date);
  }

  args.push('--max-results', ARXIV_MAX_PAPERS.toString());

  const stdout = await runPythonScript(FETCH_SCRIPT, args, 'Stage 1: Fetch Papers');
  const result = parseJsonOutput(stdout) as FetchResult;

  if (result.status === 'error') {
    throw new Error(`Fetch stage failed: ${result.error}`);
  }

  if (!result.output_file) {
    throw new Error('Fetch stage did not return output file path');
  }

  console.log(`Fetched ${result.papers_count || 0} papers`);

  // Read the JSON file to get paper data
  const jsonContent = await readFile(result.output_file, 'utf-8');
  const fetchedData: FetchedData = JSON.parse(jsonContent);

  return {
    jsonPath: result.output_file,
    papers: fetchedData.papers,
  };
}

// ============================================================================
// Stage 2: Curate Papers
// ============================================================================

async function curatePapersStage(
  inputJsonPath: string,
  date?: string
): Promise<{ markdownPath: string; curationJsonPath: string; markdown: string; curation: CurationData }> {
  const dataDir = await ensureDataDirExists();
  const args = ['--input-json', inputJsonPath, '--output-dir', dataDir];

  if (date) {
    args.push('--date', date);
  }

  args.push('--verbose');

  const stdout = await runPythonScript(AGENT_SCRIPT, args, 'Stage 2: Curate Papers');
  const result = parseJsonOutput(stdout) as CurationResult;

  if (result.status === 'error') {
    throw new Error(`Curation stage failed: ${result.error}`);
  }

  if (!result.output_markdown || !result.output_json) {
    throw new Error('Curation stage did not return output paths');
  }

  console.log(`Curated ${result.featured_count || 0} featured papers`);

  // Read both output files
  const markdown = await readFile(result.output_markdown, 'utf-8');
  const curationJson = await readFile(result.output_json, 'utf-8');
  const curation: CurationData = JSON.parse(curationJson);

  return {
    markdownPath: result.output_markdown,
    curationJsonPath: result.output_json,
    markdown,
    curation,
  };
}

// ============================================================================
// Database Storage
// ============================================================================

async function storeAllPapersAndAuthors(papers: PaperData[], reportDate: string): Promise<void> {
  console.log(`Storing ${papers.length} papers to database...`);

  // Store all papers
  const paperRecords = papers.map((p) => ({
    arxiv_id: p.arxiv_id,
    title: p.title,
    abstract: p.abstract,
    categories: p.categories,
    published_date: p.published_date,
    arxiv_url: p.arxiv_url,
    pdf_url: p.pdf_url,
  }));

  await db.storePapers(paperRecords);

  // Extract all unique authors
  const allAuthors: db.ArxivAuthor[] = [];
  const seenAuthors = new Set<string>();

  for (const paper of papers) {
    for (const author of paper.authors) {
      if (!seenAuthors.has(author.name)) {
        allAuthors.push({
          name: author.name,
          affiliation: author.affiliation,
        });
        seenAuthors.add(author.name);
      }
    }
  }

  console.log(`Upserting ${allAuthors.length} unique authors...`);
  await db.upsertAuthors(allAuthors, reportDate);

  // Link papers to authors
  const links: db.PaperAuthorLink[] = [];

  for (const paper of papers) {
    for (let i = 0; i < paper.authors.length; i += 1) {
      links.push({
        arxiv_id: paper.arxiv_id,
        author_name: paper.authors[i].name,
        position: i + 1, // 1-indexed
      });
    }
  }

  console.log(`Linking ${links.length} paper-author relationships...`);
  await db.linkPaperAuthors(links);

  console.log('Database storage complete');
}

async function markFeaturedPapersAndUpdateScores(
  curation: CurationData,
  reportDate: string
): Promise<void> {
  console.log(`Marking ${curation.featured_papers.length} papers as featured...`);

  // Mark featured papers
  const featuredPapers: db.FeaturedPaper[] = curation.featured_papers.map((fp) => ({
    arxiv_id: fp.arxiv_id,
    featured_rank: fp.featured_rank,
    curation_reason: fp.curation_reason,
  }));

  await db.markPapersFeatured(featuredPapers, reportDate);

  // Update author notability scores for all authors who published today
  console.log('Updating author notability scores...');

  const authorsToday = await db.getAuthorsOnDate(reportDate);

  for (const author of authorsToday) {
    await db.updateAuthorNotability(author.id);
  }

  // Update paper author notability scores for featured papers
  console.log('Updating paper author notability scores...');

  for (const fp of featuredPapers) {
    await db.updatePaperAuthorNotability(fp.arxiv_id);
  }

  console.log('Notability scoring complete');
}

// ============================================================================
// Main Orchestration
// ============================================================================

export async function runAndStoreArxivReport(options?: {
  date?: string;
}): Promise<ArxivReportMetadata> {
  // Use Pacific Time for date (same as other agents)
  const reportDate = options?.date || new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-'); // Convert MM/DD/YYYY to YYYY-MM-DD

  const startTime = Date.now();

  console.log(`\n=== arXiv Research Agent - ${reportDate} ===\n`);

  try {
    // Stage 1: Fetch all papers
    const { jsonPath, papers } = await fetchPapersStage(options?.date);

    // Check if we got any papers (we fetch last 3 days, so this is rare)
    if (papers.length === 0) {
      throw new Error(
        `No papers found in the last 3 days ending ${reportDate}. This is unusual - the arXiv API may be down or the date range may be too far in the future.`
      );
    }

    // Store all papers and authors to database
    await storeAllPapersAndAuthors(papers, reportDate);

    // Stage 2: Curate top papers and generate report
    const { markdown, curation } = await curatePapersStage(jsonPath, options?.date);

    // Mark featured papers and update notability scores
    await markFeaturedPapersAndUpdateScores(curation, reportDate);

    // Extract summary from markdown
    const summary = extractExecutiveSummary(markdown);

    // Store report to Supabase Storage
    const stored = await storeAgentReport({
      agent: ARXIV_AGENT_SLUG,
      date: reportDate,
      markdown,
      summary,
    });

    // Generate podcast (if ELEVENLABS_API_KEY is available)
    let podcast: PodcastGenerationResult | undefined;
    try {
      console.log('🎙️ Generating podcast...');
      const viewerUrl = buildReportViewerUrl({
        path: stored.reportPath,
        agentSlug: ARXIV_AGENT_SLUG,
      });
      let reportShortLink: string | null = null;

      try {
        reportShortLink = await createShortLink(viewerUrl, {
          context: 'arxiv-report',
          createdBy: 'sms-bot',
          createdFor: 'arxiv-agent',
        });
      } catch (err) {
        console.warn('Failed to create report short link:', err);
      }

      podcast = await generateArxivPodcast({
        date: reportDate,
        markdown,
        summary,
        reportUrl: viewerUrl,
        reportShortLink,
      });
      console.log('✓ Podcast generated:', podcast.shortLink);
    } catch (podcastError) {
      console.warn('⚠️ Podcast generation failed (non-fatal):', podcastError);
    }

    // Store daily report metadata
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    await db.storeDailyReport({
      report_date: reportDate,
      total_papers_fetched: curation.total_papers,
      featured_papers_count: curation.featured_count,
      notable_authors_count: curation.notable_authors?.length || null,
      report_path: stored.reportPath,
      report_url: stored.publicUrl || '',
      summary,
      generation_duration_seconds: durationSeconds,
    });

    console.log(`\n=== Report Generation Complete (${durationSeconds}s) ===\n`);

    return {
      ...stored,
      totalPapers: curation.total_papers,
      featuredCount: curation.featured_count,
      notableAuthorsCount: curation.notable_authors?.length || 0,
      podcast,
    };
  } catch (error) {
    console.error('arXiv report generation failed:', error);
    throw error;
  }
}

/**
 * Get latest stored arXiv report metadata
 */
export async function getLatestStoredArxivReport(): Promise<ArxivReportMetadata | null> {
  const stored = await getLatestReportMetadata(ARXIV_AGENT_SLUG);

  if (!stored) {
    return null;
  }

  // Get additional metadata from database
  const dbReport = await db.getLatestDailyReport();

  if (!dbReport) {
    return {
      ...stored,
      totalPapers: 0,
      featuredCount: 0,
      notableAuthorsCount: 0,
    };
  }

  return {
    ...stored,
    totalPapers: dbReport.total_papers_fetched,
    featuredCount: dbReport.featured_papers_count,
    notableAuthorsCount: dbReport.notable_authors_count || 0,
  };
}

/**
 * Build SMS message for arXiv report
 */
export async function buildArxivReportMessage(
  summary: string,
  date: string,
  reportPath: string,
  recipient: string,
  podcastLink?: string
): Promise<string> {
  // Build viewer URL
  const viewerUrl = buildReportViewerUrl({ path: reportPath });

  // Create short link
  const shortLink = await createShortLink(viewerUrl, {
    context: 'arxiv-report-viewer',
    createdFor: recipient,
    createdBy: 'sms-bot',
  });

  // Get report metadata
  const dbReport = await db.getDailyReportByDate(date);

  const featuredCount = dbReport?.featured_papers_count || 0;
  const totalCount = dbReport?.total_papers_fetched || 0;

  // Build message in Medical Daily format to prevent SMS splitting
  const lines: string[] = [`📚 arXiv Today - ${date}`, '', summary];

  if (podcastLink) {
    lines.push(`🎧 Listen: ${podcastLink}`);
  }

  lines.push(`📄 Full report: ${shortLink}`);

  return lines.join('\n');
}

// ============================================================================
// Scheduler Integration
// ============================================================================

export function registerArxivDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'arxiv-daily-report',
    hour: ARXIV_JOB_HOUR,
    minute: ARXIV_JOB_MINUTE,
    run: async () => {
      console.log('Starting arXiv daily job...');

      try {
        // Generate report
        const metadata = await runAndStoreArxivReport();

        // Get subscribers
        const subscribers = await getAgentSubscribers(ARXIV_AGENT_SLUG);

        if (subscribers.length === 0) {
          console.log('No arXiv subscribers, skipping broadcast');
          return;
        }

        console.log(`Broadcasting to ${subscribers.length} arXiv subscribers...`);

        // Build message with podcast link (if available)
        const message = await buildArxivReportMessage(
          metadata.summary,
          metadata.date,
          metadata.reportPath,
          'arxiv-daily',
          metadata.podcast?.shortLink || undefined
        );

        // Send to all subscribers with delay
        const delay = Number(process.env.ARXIV_BROADCAST_DELAY_MS || 150);

        for (const subscriber of subscribers) {
          try {
            await twilioClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER!,
              to: subscriber.phone_number,
            });

            // Mark as sent
            await markAgentReportSent(subscriber.phone_number, ARXIV_AGENT_SLUG);

            // Delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, delay));
          } catch (error) {
            console.error(`Failed to send to ${subscriber.phone_number}:`, error);
          }
        }

        console.log('arXiv daily broadcast complete');
      } catch (error) {
        console.error('arXiv daily job failed:', error);
        throw error;
      }
    },
  });

  console.log(`arXiv daily job registered for ${ARXIV_JOB_HOUR}:${String(ARXIV_JOB_MINUTE).padStart(2, '0')} PT`);
}
