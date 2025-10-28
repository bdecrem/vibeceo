/**
 * arXiv Research Graph Agent - TypeScript Wrapper
 *
 * Orchestrates the multi-stage process:
 * 1. Fetch ALL AI/ML papers from arXiv (Python script)
 * 2. Load papers into Neo4j graph database with authorship tracking
 * 3. Enrich authors with GitHub/Semantic Scholar data
 * 4. Curate papers using graph insights (productive authors, rising stars, collaborations, trending topics)
 * 5. Store report to Supabase Storage
 * 6. Return metadata for SMS/scheduling
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { storeAgentReport, type StoredReportMetadata } from '../report-storage.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import {
  getAgentSubscribers,
  markAgentReportSent,
  type AgentSubscriber,
} from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';
import {
  buildEpisodeTitle,
  generateArxivPodcast,
  getPodcastTopicId,
  type PodcastGenerationResult,
} from './podcast.js';
import {
  markPapersFeatured as markGraphPapersFeatured,
  updateAuthorMetricsForDate,
  updatePaperAuthorNotability,
  upsertReport as upsertGraphReport,
  getLatestReport as getLatestGraphReport,
  getAuthorStatsByNames,
  type GraphFeaturedPaperInput,
} from './graph-dao.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data', 'arxiv-reports');
const FETCH_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research', 'fetch_papers.py');
const CURATE_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research-graph', 'curate_with_agent.py');
const LOAD_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research-graph', 'load_recent_papers.py');
const FUZZY_MATCH_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research-graph', 'kochi_fuzzy_match_v2.py');
const ENRICH_SCRIPT = path.join(process.cwd(), 'agents', 'arxiv-research-graph', 'enrich_authors.py');
// Use system python3 by default (works on any Mac). Override with PYTHON_BIN env var if needed.
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

const ARXIV_JOB_HOUR = Number(process.env.ARXIV_REPORT_HOUR || 6);
const ARXIV_JOB_MINUTE = Number(process.env.ARXIV_REPORT_MINUTE || 0);
const ARXIV_MAX_PAPERS = Number(process.env.ARXIV_MAX_PAPERS || 1000);

const REPORTS_BUCKET = process.env.AGENT_REPORTS_BUCKET || 'agent-reports';

export const ARXIV_GRAPH_AGENT_SLUG = 'arxiv-graph';

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

interface PaperAuthor {
  name: string;
  affiliation?: string | null;
  notability_score?: number | null;
  paper_count?: number | null;
  featured_paper_count?: number | null;
  first_seen_date?: string | null;
  last_seen_date?: string | null;
}

interface PaperData {
  arxiv_id: string;
  title: string;
  abstract: string;
  authors: PaperAuthor[];
  categories: string[];
  published_date: string;
  arxiv_url: string;
  pdf_url: string;
  author_notability_score?: number;
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

async function enrichPapersWithAuthorStats(papers: PaperData[]): Promise<PaperData[]> {
  const uniqueAuthorNames = new Set<string>();

  for (const paper of papers) {
    for (const author of paper.authors) {
      if (author?.name) {
        uniqueAuthorNames.add(author.name);
      }
    }
  }

  const statsLookup = await getAuthorStatsByNames(Array.from(uniqueAuthorNames));

  return papers.map((paper) => {
    let totalNotability = 0;

    const enrichedAuthors = paper.authors.map((author) => {
      const stats = author?.name ? statsLookup[author.name] : undefined;
      if (stats) {
        totalNotability += stats.notabilityScore || 0;
      }

      return {
        ...author,
        notability_score: stats?.notabilityScore ?? null,
        paper_count: stats?.paperCount ?? null,
        featured_paper_count: stats?.featuredPaperCount ?? null,
        h_index: stats?.hIndex ?? null,
        citation_count: stats?.citationCount ?? null,
        github_stars: stats?.githubStars ?? null,
        affiliation: stats?.affiliation ?? null,
        openalex_matched_name: stats?.openalexMatchedName ?? null,
        openalex_match_type: stats?.openalexMatchType ?? null,
        openalex_match_confidence: stats?.openalexMatchConfidence ?? null,
        openalex_relevance_score: stats?.openalexRelevanceScore ?? null,
      };
    });

    return {
      ...paper,
      authors: enrichedAuthors,
      author_notability_score: totalNotability || undefined,
    };
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

interface RunPythonOptions {
  needsClaudeCodeAuth?: boolean;
  extraEnv?: Record<string, string | undefined>;
}

async function runPythonScript(
  scriptPath: string,
  args: string[],
  description: string,
  options?: RunPythonOptions
): Promise<string> {
  console.log(`Running ${description}...`);

  // CRITICAL: Do NOT spread process.env - it includes CLAUDE_CODE_OAUTH_TOKEN from Claude Code session
  // which causes auth to use wrong account. Follow pattern from CLAUDE-AGENT-SDK-SETUP.md:
  // Only pass specific vars, explicitly exclude CLAUDE_CODE_OAUTH_TOKEN
  const env: Record<string, string | undefined> = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    // Explicitly set PYTHONPATH to Homebrew site-packages so spawned processes can find installed packages
    PYTHONPATH: '/opt/homebrew/lib/python3.13/site-packages:/Users/bartdecrem/Library/Python/3.13/lib/python/site-packages',
    ANTHROPIC_API_KEY:
      process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.ANTHROPIC_API_KEY,
  };

  env.CLAUDE_CODE_OAUTH_TOKEN = undefined;

  if (options?.extraEnv) {
    for (const [key, value] of Object.entries(options.extraEnv)) {
      if (typeof value === 'string' && value.trim().length) {
        env[key] = value;
      }
    }
  }

  const subprocess = spawn(PYTHON_BIN, ['-u', scriptPath, ...args], { // -u for unbuffered output
    cwd: process.cwd(),
    env,
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
  const args = ['--output-dir', dataDir];

  if (date) {
    args.push('--date', date);
  }

  const stdout = await runPythonScript(CURATE_SCRIPT, args, 'Stage 2: AI Curation (Graph-Enhanced)', {
    needsClaudeCodeAuth: true,  // Claude Agent SDK needs auth
    extraEnv: {
      NEO4J_URI: requireEnvVar('NEO4J_URI'),
      NEO4J_USERNAME: requireEnvVar('NEO4J_USERNAME'),
      NEO4J_PASSWORD: requireEnvVar('NEO4J_PASSWORD'),
      NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
    },
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
// Graph Storage Helpers
// ============================================================================

function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${name} is required for arxiv-graph`);
  }
  return value;
}

async function loadPapersIntoGraphFromJson(jsonPath: string): Promise<void> {
  console.log(`Loading papers into Neo4j from ${jsonPath}...`);

  await runPythonScript(
    LOAD_SCRIPT,
    ['--input-json', jsonPath],
    'Stage 1b: Load papers into Neo4j',
    {
      extraEnv: {
        NEO4J_URI: requireEnvVar('NEO4J_URI'),
        NEO4J_USERNAME: requireEnvVar('NEO4J_USERNAME'),
        NEO4J_PASSWORD: requireEnvVar('NEO4J_PASSWORD'),
        NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
      },
    }
  );
}

async function applyGraphCuration(
  curation: CurationData,
  reportDate: string
): Promise<GraphFeaturedPaperInput[]> {
  const featured: GraphFeaturedPaperInput[] = curation.featured_papers.map((fp) => ({
    arxivId: fp.arxiv_id,
    featuredRank: fp.featured_rank,
    curationReason: fp.curation_reason,
    starRating: typeof fp.star_rating === 'number' ? fp.star_rating : null,
  }));

  if (featured.length) {
    await markGraphPapersFeatured(featured, reportDate);
    console.log(`Marked ${featured.length} papers as featured in Neo4j.`);
  } else {
    console.warn('No featured papers returned by curation.');
  }

  const updatedAuthors = await updateAuthorMetricsForDate(reportDate);
  console.log(`Updated notability metrics for ${updatedAuthors} authors.`);

  const featuredIds = featured.map((fp) => fp.arxivId);
  if (featuredIds.length) {
    await updatePaperAuthorNotability(featuredIds);
    console.log(`Recalculated author notability scores for ${featuredIds.length} featured papers.`);
  }

  return featured;
}

// ============================================================================
// Main Orchestration
// ============================================================================

export async function runAndStoreArxivGraphReport(options?: {
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

    const enrichedPapers = await enrichPapersWithAuthorStats(papers);

    // Write combined deduplicated papers to JSON for curation stage
    const dataDir = await ensureDataDirExists();
    const combinedJsonPath = path.join(dataDir, `arxiv_papers_combined_${reportDate}.json`);
    const combinedData = {
      fetch_date: new Date().toISOString(),
      target_date: reportDate,
      total_papers: enrichedPapers.length,
      categories: ['cs.AI', 'cs.LG', 'cs.CV', 'cs.CL', 'stat.ML'],
      papers: enrichedPapers,
    };
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(combinedJsonPath, JSON.stringify(combinedData, null, 2))
    );
    console.log(`Wrote combined papers to: ${combinedJsonPath}`);

    // Load papers into Neo4j graph
    await loadPapersIntoGraphFromJson(combinedJsonPath);

    // Stage 1c: Fuzzy match new authors from today
    console.log('Running Stage 1c: Fuzzy Match New Authors...');
    try {
      await runPythonScript(
        FUZZY_MATCH_SCRIPT,
        ['--date', reportDate],
        'Stage 1c: Fuzzy Match New Authors',
        {
          extraEnv: {
            NEO4J_URI: requireEnvVar('NEO4J_URI'),
            NEO4J_USERNAME: requireEnvVar('NEO4J_USERNAME'),
            NEO4J_PASSWORD: requireEnvVar('NEO4J_PASSWORD'),
            NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
          },
        }
      );
      console.log('✓ Fuzzy matching complete');
    } catch (error) {
      // Non-fatal - continue even if fuzzy matching fails
      console.warn('⚠️ Fuzzy matching failed (non-fatal):', error);
    }

    // Stage 1d: Enrich authors with GitHub and Semantic Scholar data
    console.log('Running Stage 1d: Enrich Authors...');
    const arxivIdsForEnrichment = combinedData.papers.map((p: any) => p.arxiv_id).join(',');
    try {
      await runPythonScript(
        ENRICH_SCRIPT,
        ['--arxiv-ids', arxivIdsForEnrichment],
        'Stage 1d: Enrich Authors',
        {
          extraEnv: {
            NEO4J_URI: requireEnvVar('NEO4J_URI'),
            NEO4J_USERNAME: requireEnvVar('NEO4J_USERNAME'),
            NEO4J_PASSWORD: requireEnvVar('NEO4J_PASSWORD'),
            NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
            GITHUB_API_TOKEN: process.env.GITHUB_API_TOKEN,
          },
        }
      );
      console.log('✓ Author enrichment complete');
    } catch (error) {
      // Non-fatal - continue even if enrichment fails
      console.warn('⚠️ Author enrichment failed (non-fatal):', error);
    }

    // Stage 2: Curate top papers and generate report
    const { markdown, curation } = await curatePapersStage(combinedJsonPath, options?.date);

    // Mark featured papers and update notability scores
    const featuredForGraph = await applyGraphCuration(curation, reportDate);

    // Extract summary from markdown
    const summary = extractExecutiveSummary(markdown);

    // Store report to Supabase Storage
    const stored = await storeAgentReport({
      agent: ARXIV_GRAPH_AGENT_SLUG,
      date: reportDate,
      markdown,
      summary,
    });

    const viewerUrl = buildReportViewerUrl({
      path: stored.reportPath,
      agentSlug: ARXIV_GRAPH_AGENT_SLUG,
    });

    let reportShortLink: string | null = null;

    try {
      reportShortLink = await createShortLink(viewerUrl, {
        context: 'arxiv-graph-report',
        createdBy: 'sms-bot',
        createdFor: 'arxiv-graph-agent',
      });
    } catch (err) {
      console.warn('Failed to create report short link:', err);
    }

    // Generate podcast (if ELEVENLABS_API_KEY is available)
    let podcast: PodcastGenerationResult | undefined;
    try {
      console.log('🎙️ Generating podcast...');
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

    await upsertGraphReport(
      {
        reportDate,
        summary,
        totalPapers: curation.total_papers,
        featuredCount: curation.featured_count,
        notableAuthorsCount: curation.notable_authors?.length ?? 0,
        durationSeconds,
        reportPath: stored.reportPath,
        metadataPath: stored.metadataPath,
        storageBucket: REPORTS_BUCKET,
        reportUrl: stored.publicUrl ?? null,
        viewerUrl,
        reportShortLink,
        podcastShortLink: podcast?.shortLink ?? null,
        podcastEpisodeId: podcast ? String(podcast.episodeId) : null,
        podcastAudioUrl: podcast?.audioUrl ?? null,
        podcastTopicId: podcast?.topicId ?? null,
        notableAuthorNames: curation.notable_authors?.map((author) => author.name) ?? [],
        createdAtIso: stored.createdAt,
      },
      featuredForGraph
    );

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
 * Get latest stored arXiv report metadata from Neo4j
 */
export async function getLatestStoredArxivGraphReport(): Promise<ArxivReportMetadata | null> {
  const graphReport = await getLatestGraphReport();

  if (!graphReport) {
    return null;
  }

  const stored: StoredReportMetadata = {
    agent: ARXIV_GRAPH_AGENT_SLUG,
    date: graphReport.reportDate,
    summary: graphReport.summary,
    reportPath: graphReport.reportPath,
    metadataPath: graphReport.metadataPath,
    createdAt: graphReport.createdAtIso ?? new Date().toISOString(),
    publicUrl: graphReport.reportUrl ?? graphReport.viewerUrl ?? null,
  };

  let podcast: PodcastGenerationResult | undefined;
  if (graphReport.podcastShortLink || graphReport.podcastAudioUrl) {
    podcast = {
      episodeId: graphReport.podcastEpisodeId
        ? Number(graphReport.podcastEpisodeId) || 0
        : 0,
      topicId: graphReport.podcastTopicId ?? getPodcastTopicId(),
      shortLink: graphReport.podcastShortLink ?? null,
      reportLink: graphReport.reportShortLink ?? null,
      audioUrl: graphReport.podcastAudioUrl ?? '',
      title: buildEpisodeTitle(graphReport.reportDate),
      durationSeconds: graphReport.durationSeconds ?? 0,
    };
  }

  return {
    ...stored,
    totalPapers: graphReport.totalPapers,
    featuredCount: graphReport.featuredCount,
    notableAuthorsCount: graphReport.notableAuthorsCount,
    podcast,
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

export function registerArxivGraphDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'arxiv-graph-daily-report',
    hour: ARXIV_JOB_HOUR,
    minute: ARXIV_JOB_MINUTE,
    run: async () => {
      console.log('Starting arXiv graph daily job...');

      try {
        // Generate report
        const metadata = await runAndStoreArxivGraphReport();

        // Get subscribers
        const subscribers = await getAgentSubscribers(ARXIV_GRAPH_AGENT_SLUG);

        if (subscribers.length === 0) {
          console.log('No arXiv graph subscribers, skipping broadcast');
          return;
        }

        console.log(`Broadcasting to ${subscribers.length} arXiv graph subscribers...`);

        // Build message with podcast link (if available)
        const message = await buildArxivReportMessage(
          metadata.summary,
          metadata.date,
          metadata.reportPath,
          ARXIV_GRAPH_AGENT_SLUG,
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
            await markAgentReportSent(subscriber.phone_number, ARXIV_GRAPH_AGENT_SLUG);

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

  console.log(
    `arXiv graph daily job registered for ${ARXIV_JOB_HOUR}:${String(ARXIV_JOB_MINUTE).padStart(2, '0')} PT`
  );
}
