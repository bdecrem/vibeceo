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
import OpenAI from 'openai';
import {
  storeAgentReport,
  type StoredReportMetadata,
  getLatestReportMetadata,
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
import * as db from './database.js';
import { storeSystemAction } from '../../lib/context-loader.js';
import {
  buildEpisodeTitle,
  generateArxivPodcast,
  getPodcastTopicId,
  type PodcastGenerationResult,
} from './podcast.js';
import { supabase } from '../../lib/supabase.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data', 'arxiv-reports');
const FETCH_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research', 'fetch_papers.py');
const AGENT_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research', 'agent.py');
// Use system python3 by default (works on any Mac). Override with PYTHON_BIN env var if needed.
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

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

/**
 * Deduplicate papers by arxiv_id, keeping the first occurrence
 */
function deduplicatePapers(papers: PaperData[]): PaperData[] {
  const seen = new Set<string>();
  return papers.filter((paper) => {
    if (seen.has(paper.arxiv_id)) {
      return false;
    }
    seen.add(paper.arxiv_id);
    return true;
  });
}

const SMS_SUMMARY_MODEL = process.env.ARXIV_SMS_SUMMARY_MODEL || 'gpt-4o-mini';
const SMS_SUMMARY_MAX_CHARS = Number(process.env.ARXIV_SMS_SUMMARY_MAX_CHARS || 320);

let cachedOpenAIClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required to generate SMS summaries');
  }

  if (!cachedOpenAIClient) {
    cachedOpenAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return cachedOpenAIClient;
}

interface SmsDigestParams {
  date: string;
  executiveSummary: string;
  reportLink: string;
  audioLink?: string | null;
}

async function generateArxivSmsDigest(
  params: SmsDigestParams
): Promise<string> {
  const openai = getOpenAIClient();

  const audioLine = params.audioLink
    ? `🎧 Listen: ${params.audioLink}`
    : null;
  const reportLine = `📄 Full: ${params.reportLink}`;
  const closingLines = audioLine ? [audioLine, reportLine] : [reportLine];
  const header = `📚 arXiv Today - ${params.date}`;

  const promptLines = [
    "Summarize today's AI research trends from the following executive summary in a short SMS body (max 230 characters).",
    'Style guide:',
    '• Sound like a smart, energetic human highlighting the day’s breakthroughs—no numbered lists or markdown formatting.',
    '• Keep it conversational and flowing, not academic.',
    '• Highlight up to three ideas using short phrases separated by commas or em dashes.',
    '• Add one or two fitting emojis for tone, but keep it sleek (no emoji before every phrase).',
    '• Do NOT include the intro header or the final link lines; those will be added later.',
    '',
    'Executive Summary:',
    params.executiveSummary.trim(),
  ];

  const response = await openai.chat.completions.create({
    model: SMS_SUMMARY_MODEL,
    temperature: 0.6,
    max_tokens: 220,
    messages: [
      {
        role: 'system',
        content:
          'You are an energetic editor who distills arXiv AI research reports into lively SMS briefings. Keep the body under 230 characters, flowing, and free of links or markdown. The system will add the intro header and closing links.',
      },
      {
        role: 'user',
        content: promptLines.join('\n'),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();

  if (!raw) {
    throw new Error('OpenAI returned an empty SMS summary');
  }

  const sanitizedBody = sanitizeGeneratedBody(raw, header, closingLines);
  const message = composeSmsMessage(header, sanitizedBody, closingLines);

  if (!message) {
    throw new Error('Failed to compose SMS message from generated body');
  }

  return message;
}

function sanitizeGeneratedBody(
  rawBody: string,
  header: string,
  closingLines: string[]
): string {
  const disallowedPrefixes = ['🎧 listen:', '📄 full:'];

  const lines = rawBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => {
      const normalized = line.toLowerCase();
      if (normalized === header.toLowerCase()) {
        return false;
      }
      return !disallowedPrefixes.some((prefix) => normalized.startsWith(prefix));
    });

  let body = lines.join(' ');
  body = body.replace(/\s+/g, ' ').trim();

  // Remove trailing duplicates of closing lines
  for (const closing of closingLines) {
    const lowerClosing = closing.toLowerCase();
    if (body.toLowerCase().endsWith(lowerClosing)) {
      body = body.slice(0, -closing.length).trim();
    }
  }

  return body;
}

function composeSmsMessage(
  header: string,
  body: string,
  closingLines: string[]
): string {
  const normalizedBody = body.replace(/\s+/g, ' ').trim();
  const closings = closingLines.filter((line) => line && line.trim().length > 0);

  const buildMessage = (bodyContent: string): string => {
    const parts: string[] = [header];
    if (bodyContent.trim().length > 0) {
      parts.push(bodyContent.trim());
    }
    parts.push(...closings);
    return parts.join('\n').trim();
  };

  let candidateBody = normalizedBody;
  let message = buildMessage(candidateBody);

  if (message.length <= SMS_SUMMARY_MAX_CHARS) {
    return message;
  }

  if (candidateBody.length === 0) {
    return buildMessage('');
  }

  const sentences = splitIntoSentences(candidateBody);
  for (let length = sentences.length; length > 0; length -= 1) {
    const sentenceBody = sentences.slice(0, length).join(' ').trim();
    if (!sentenceBody.length) {
      continue;
    }
    message = buildMessage(sentenceBody);
    if (message.length <= SMS_SUMMARY_MAX_CHARS) {
      return message;
    }
  }

  const truncatedByWords = truncateBodyByWords(candidateBody, buildMessage);
  if (truncatedByWords) {
    return buildMessage(truncatedByWords);
  }

  return buildMessage('');
}

function buildFallbackSmsDigest(params: SmsDigestParams): string {
  const audioLine = params.audioLink
    ? `🎧 Listen: ${params.audioLink}`
    : null;
  const reportLine = `📄 Full: ${params.reportLink}`;
  const closingLines = audioLine ? [audioLine, reportLine] : [reportLine];
  const header = `📚 arXiv Today - ${params.date}`;
  const body = params.executiveSummary.replace(/\s+/g, ' ').trim();

  return composeSmsMessage(header, body, closingLines);
}

function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) {
    return [text];
  }

  return matches.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}

function truncateBodyByWords(
  body: string,
  buildMessage: (bodyText: string) => string
): string | null {
  const words = body.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return null;
  }

  for (let count = words.length; count > 0; count -= 1) {
    const truncatedBody = `${words.slice(0, count).join(' ')}…`;
    const message = buildMessage(truncatedBody);
    if (message.length <= SMS_SUMMARY_MAX_CHARS) {
      return truncatedBody;
    }
  }

  return null;
}

async function runPythonScript(
  scriptPath: string,
  args: string[],
  description: string,
  options?: { needsClaudeCodeAuth?: boolean }
): Promise<string> {
  console.log(`Running ${description}...`);

  // CRITICAL: Do NOT spread process.env - it includes CLAUDE_CODE_OAUTH_TOKEN from Claude Code session
  // which causes auth to use wrong account. Follow pattern from CLAUDE-AGENT-SDK-SETUP.md:
  // Only pass specific vars, explicitly exclude CLAUDE_CODE_OAUTH_TOKEN
  const subprocess = spawn(PYTHON_BIN, ['-u', scriptPath, ...args], {  // -u for unbuffered output
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ANTHROPIC_API_KEY: process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.ANTHROPIC_API_KEY,
      // Explicitly exclude CLAUDE_CODE_OAUTH_TOKEN to force API key usage
      CLAUDE_CODE_OAUTH_TOKEN: undefined,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  subprocess.stdout.on('data', (data) => {
    const text = data.toString();
    stdout += text;
    // Echo Python output to console for debugging
    process.stdout.write(text);
  });

  subprocess.stderr.on('data', (data) => {
    const text = data.toString();
    stderr += text;
    process.stderr.write(text);
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

  const stdout = await runPythonScript(AGENT_SCRIPT, args, 'Stage 2: Curate Papers', {
    needsClaudeCodeAuth: true,  // agent.py needs CLAUDE_CODE_OAUTH_TOKEN for Claude Agent SDK
  });
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

  // Extract all unique authors AND build author → most recent paper date map
  const allAuthors: db.ArxivAuthor[] = [];
  const seenAuthors = new Set<string>();
  const authorDates = new Map<string, string>();

  for (const paper of papers) {
    for (const author of paper.authors) {
      // Track unique authors
      if (!seenAuthors.has(author.name)) {
        allAuthors.push({
          name: author.name,
          affiliation: author.affiliation,
        });
        seenAuthors.add(author.name);
      }

      // Track most recent paper date for each author
      const currentDate = authorDates.get(author.name);
      if (!currentDate || paper.published_date > currentDate) {
        authorDates.set(author.name, paper.published_date);
      }
    }
  }

  console.log(`Upserting ${allAuthors.length} unique authors with individual paper dates...`);
  await db.upsertAuthors(allAuthors, authorDates);

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
  // Use YESTERDAY in Pacific Time (arXiv publishes daily around midnight UTC = 5pm PT previous day)
  // So at 6am PT we fetch yesterday's papers which are already published
  const reportDate = options?.date || (() => {
    const now = new Date();
    const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    // Subtract 1 day
    pacificNow.setDate(pacificNow.getDate() - 1);
    const year = pacificNow.getFullYear();
    const month = String(pacificNow.getMonth() + 1).padStart(2, '0');
    const day = String(pacificNow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const startTime = Date.now();

  console.log(`\n=== arXiv Research Agent - ${reportDate} ===\n`);

  try {
    // Stage 1: Fetch papers from last 3 days (handles arXiv indexing delays)
    const datesToFetch: string[] = [];

    if (options?.date) {
      // If explicit date provided, fetch that date plus 2 days before
      const baseDate = new Date(options.date);
      for (let i = 0; i < 3; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        datesToFetch.push(`${year}-${month}-${day}`);
      }
    } else {
      // Default: fetch yesterday, 2 days ago, 3 days ago
      const now = new Date();
      const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      for (let i = 1; i <= 3; i++) {
        const d = new Date(pacificNow);
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        datesToFetch.push(`${year}-${month}-${day}`);
      }
    }

    console.log(`Fetching papers from ${datesToFetch.length} days: ${datesToFetch.join(', ')}`);

    // Fetch papers for each date
    const allPapers: PaperData[] = [];
    let lastJsonPath = '';

    for (const date of datesToFetch) {
      const { jsonPath, papers } = await fetchPapersStage(date);
      allPapers.push(...papers);
      lastJsonPath = jsonPath; // Keep last path for curation stage
      console.log(`  ${date}: ${papers.length} papers`);
    }

    // Deduplicate papers by arxiv_id
    const papers = deduplicatePapers(allPapers);
    console.log(`Total papers after deduplication: ${papers.length} (from ${allPapers.length} fetched)`);

    // Check if we got any papers
    if (papers.length === 0) {
      throw new Error(
        `No papers found for dates ${datesToFetch.join(', ')}. The arXiv API may be down.`
      );
    }

    // Write combined deduplicated papers to JSON for curation stage
    const dataDir = await ensureDataDirExists();
    const combinedJsonPath = path.join(dataDir, `arxiv_papers_combined_${reportDate}.json`);
    const combinedData = {
      fetch_date: new Date().toISOString(),
      target_date: reportDate,
      total_papers: papers.length,
      categories: ['cs.AI', 'cs.LG', 'cs.CV', 'cs.CL', 'stat.ML'],
      papers,
    };
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(combinedJsonPath, JSON.stringify(combinedData, null, 2))
    );
    console.log(`Wrote combined papers to: ${combinedJsonPath}`);

    // Store all papers and authors to database
    await storeAllPapersAndAuthors(papers, reportDate);

    // Stage 2: Curate top papers and generate report
    const { markdown, curation } = await curatePapersStage(combinedJsonPath, options?.date);

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

  // Get podcast metadata from episodes table
  let podcast: PodcastGenerationResult | undefined;
  try {
    const episodeTitle = buildEpisodeTitle(stored.date);
    const topicId = getPodcastTopicId();

    const { data: episode } = await supabase
      .from('episodes')
      .select('id, topic_id, title, audio_url, show_notes_json')
      .eq('topic_id', topicId)
      .eq('title', episodeTitle)
      .limit(1)
      .maybeSingle();

    if (episode) {
      const shortLink =
        extractAudioShortLink(episode.show_notes_json) ||
        (typeof episode.audio_url === 'string' && episode.audio_url.trim().length
          ? episode.audio_url.trim()
          : null);

      if (shortLink) {
        podcast = {
          episodeId: episode.id,
          topicId: episode.topic_id,
          shortLink,
          reportLink: null, // Not needed for SMS
          audioUrl: episode.audio_url ?? '',
          title: '', // Not needed for SMS
          durationSeconds: 0, // Not needed for SMS
        };
      }
    }
  } catch (err) {
    // Podcast not found or error - non-fatal
  }

  return {
    ...stored,
    totalPapers: dbReport.total_papers_fetched,
    featuredCount: dbReport.featured_papers_count,
    notableAuthorsCount: dbReport.notable_authors_count || 0,
    podcast,
  };
}

function extractAudioShortLink(value: unknown): string | null {
  if (!value) {
    return null;
  }

  let notes: Record<string, unknown> | null = null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        notes = parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  } else if (typeof value === 'object') {
    notes = value as Record<string, unknown>;
  }

  if (!notes) {
    return null;
  }

  const audio = notes.audio;
  if (audio && typeof audio === 'object') {
    const candidate = (audio as Record<string, unknown>).shortLink;
    if (typeof candidate === 'string' && candidate.trim().length) {
      return normalizeShortLinkDomain(candidate.trim());
    }
  }

  const legacy = notes.shortLink;
  if (typeof legacy === 'string' && legacy.trim().length) {
    return normalizeShortLinkDomain(legacy.trim());
  }

  return null;
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
  const reportLink = shortLink ?? viewerUrl;
  const audioLink = podcastLink ?? null;

  let smsMessage: string | null = null;

  try {
    smsMessage = await generateArxivSmsDigest({
      date,
      executiveSummary: summary,
      reportLink,
      audioLink,
    });
  } catch (error) {
    console.warn('Failed to generate AI SMS digest via OpenAI:', error);
  }

  if (!smsMessage) {
    smsMessage = buildFallbackSmsDigest({
      date,
      executiveSummary: summary,
      reportLink,
      audioLink,
    });
  }

  return smsMessage;
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

            // Store message content in conversation context
            await storeSystemAction(subscriber.id, {
              type: 'arxiv_research_sent',
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

        console.log('arXiv daily broadcast complete');
      } catch (error) {
        console.error('arXiv daily job failed:', error);
        throw error;
      }
    },
  });

  console.log(`arXiv daily job registered for ${ARXIV_JOB_HOUR}:${String(ARXIV_JOB_MINUTE).padStart(2, '0')} PT`);
}
