/**
 * RivalAlert Website Monitor
 *
 * Fetches competitor websites, extracts content, and detects changes.
 */

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import type { RaCompetitor, SnapshotContent } from './types.js';
import * as db from './db.js';

// ============================================================================
// Configuration
// ============================================================================

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Website Fetching
// ============================================================================

export async function fetchWebsite(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Content Extraction
// ============================================================================

export function extractContent(html: string, url: string): SnapshotContent {
  const $ = cheerio.load(html);

  // Remove script/style tags for cleaner text
  $('script, style, noscript, iframe').remove();

  const content: SnapshotContent = {
    title: $('title').text().trim() || undefined,
    description:
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      undefined,
    pricing: extractPricing($),
    features: extractFeatures($),
    raw_text: extractMainText($),
    html_hash: hashContent(html),
  };

  // Try to extract jobs if it looks like a careers page
  if (url.includes('career') || url.includes('job') || url.includes('hiring')) {
    content.jobs = extractJobs($, url);
  }

  return content;
}

function extractPricing($: cheerio.CheerioAPI): SnapshotContent['pricing'] {
  const pricing: NonNullable<SnapshotContent['pricing']> = [];

  // Common pricing selectors
  const pricingSelectors = [
    '[class*="pricing"]',
    '[class*="price"]',
    '[class*="plan"]',
    '[data-pricing]',
    '.tier',
    '.package',
  ];

  // Look for pricing cards/sections
  $(pricingSelectors.join(', ')).each((_, el) => {
    const $el = $(el);
    const text = $el.text();

    // Look for price patterns ($XX, $XX/mo, etc.)
    const priceMatch = text.match(/\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year))?/i);

    if (priceMatch) {
      const planName =
        $el.find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim() ||
        'Unknown Plan';

      pricing.push({
        plan_name: planName.slice(0, 100),
        price: priceMatch[0],
        period: text.match(/\/(mo|month|yr|year)/i)?.[1] || undefined,
      });
    }
  });

  // Dedupe by plan name
  const seen = new Set<string>();
  return pricing.filter((p) => {
    const key = `${p.plan_name}-${p.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractFeatures($: cheerio.CheerioAPI): string[] {
  const features: string[] = [];

  // Common feature list selectors
  const featureSelectors = [
    '[class*="feature"] li',
    '[class*="benefit"] li',
    '.features li',
    'ul[class*="check"] li',
    '[class*="included"] li',
  ];

  $(featureSelectors.join(', ')).each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 200) {
      features.push(text);
    }
  });

  // Dedupe and limit
  return [...new Set(features)].slice(0, 50);
}

function extractJobs($: cheerio.CheerioAPI, baseUrl: string): SnapshotContent['jobs'] {
  const jobs: NonNullable<SnapshotContent['jobs']> = [];

  // Common job listing selectors
  const jobSelectors = [
    '[class*="job"]',
    '[class*="position"]',
    '[class*="opening"]',
    '[class*="career"]',
    'a[href*="job"]',
    'a[href*="career"]',
  ];

  $(jobSelectors.join(', ')).each((_, el) => {
    const $el = $(el);
    const title = $el.find('h2, h3, h4, [class*="title"]').first().text().trim() || $el.text().trim();

    if (title.length > 5 && title.length < 150) {
      const href = $el.attr('href') || $el.find('a').first().attr('href');
      let jobUrl: string | undefined;

      if (href) {
        try {
          jobUrl = new URL(href, baseUrl).toString();
        } catch {
          // Invalid URL, skip
        }
      }

      jobs.push({
        title: title.slice(0, 150),
        url: jobUrl,
      });
    }
  });

  // Dedupe by title
  const seen = new Set<string>();
  return jobs
    .filter((j) => {
      if (seen.has(j.title)) return false;
      seen.add(j.title);
      return true;
    })
    .slice(0, 30);
}

function extractMainText($: cheerio.CheerioAPI): string {
  // Get main content area text
  const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content'];
  let text = '';

  for (const selector of mainSelectors) {
    const $main = $(selector);
    if ($main.length) {
      text = $main.text();
      break;
    }
  }

  // Fallback to body
  if (!text) {
    text = $('body').text();
  }

  // Clean up whitespace
  return text.replace(/\s+/g, ' ').trim().slice(0, 10000);
}

// ============================================================================
// Change Detection
// ============================================================================

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export interface ChangeDetectionResult {
  hasChanges: boolean;
  changeType?: 'pricing' | 'feature' | 'job_posting' | 'content';
  summary?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export function detectChanges(
  oldContent: SnapshotContent | null,
  newContent: SnapshotContent
): ChangeDetectionResult[] {
  const changes: ChangeDetectionResult[] = [];

  if (!oldContent) {
    // First snapshot - no changes to detect
    return [];
  }

  // Check pricing changes
  const oldPricing = JSON.stringify(oldContent.pricing || []);
  const newPricing = JSON.stringify(newContent.pricing || []);
  if (oldPricing !== newPricing && newContent.pricing?.length) {
    changes.push({
      hasChanges: true,
      changeType: 'pricing',
      summary: `Pricing changed: ${summarizePricingChange(oldContent.pricing, newContent.pricing)}`,
      oldValue: { pricing: oldContent.pricing },
      newValue: { pricing: newContent.pricing },
    });
  }

  // Check feature changes
  const oldFeatures = new Set(oldContent.features || []);
  const newFeatures = new Set(newContent.features || []);
  const addedFeatures = [...newFeatures].filter((f) => !oldFeatures.has(f));
  const removedFeatures = [...oldFeatures].filter((f) => !newFeatures.has(f));

  if (addedFeatures.length > 0 || removedFeatures.length > 0) {
    changes.push({
      hasChanges: true,
      changeType: 'feature',
      summary: summarizeFeatureChanges(addedFeatures, removedFeatures),
      oldValue: { features: oldContent.features },
      newValue: { features: newContent.features },
    });
  }

  // Check job postings
  const oldJobs = new Set((oldContent.jobs || []).map((j) => j.title));
  const newJobs = new Set((newContent.jobs || []).map((j) => j.title));
  const addedJobs = (newContent.jobs || []).filter((j) => !oldJobs.has(j.title));

  if (addedJobs.length > 0) {
    changes.push({
      hasChanges: true,
      changeType: 'job_posting',
      summary: `${addedJobs.length} new job posting(s): ${addedJobs.map((j) => j.title).join(', ')}`,
      oldValue: { jobs: oldContent.jobs },
      newValue: { jobs: newContent.jobs },
    });
  }

  // Check overall content hash (fallback for general changes)
  if (changes.length === 0 && oldContent.html_hash !== newContent.html_hash) {
    // Significant text change?
    const oldText = oldContent.raw_text || '';
    const newText = newContent.raw_text || '';
    const similarity = calculateTextSimilarity(oldText, newText);

    if (similarity < 0.9) {
      changes.push({
        hasChanges: true,
        changeType: 'content',
        summary: `Website content changed (${Math.round((1 - similarity) * 100)}% different)`,
        oldValue: { text_preview: oldText.slice(0, 500) },
        newValue: { text_preview: newText.slice(0, 500) },
      });
    }
  }

  return changes;
}

function summarizePricingChange(
  oldPricing: SnapshotContent['pricing'],
  newPricing: SnapshotContent['pricing']
): string {
  if (!oldPricing?.length && newPricing?.length) {
    return `New pricing: ${newPricing.map((p) => `${p.plan_name}: ${p.price}`).join(', ')}`;
  }

  if (!newPricing?.length) {
    return 'Pricing removed from page';
  }

  // Find specific changes
  const changes: string[] = [];
  for (const newPlan of newPricing) {
    const oldPlan = oldPricing?.find((p) => p.plan_name === newPlan.plan_name);
    if (!oldPlan) {
      changes.push(`New plan: ${newPlan.plan_name} (${newPlan.price})`);
    } else if (oldPlan.price !== newPlan.price) {
      changes.push(`${newPlan.plan_name}: ${oldPlan.price} → ${newPlan.price}`);
    }
  }

  return changes.length > 0 ? changes.join('; ') : 'Pricing structure changed';
}

function summarizeFeatureChanges(added: string[], removed: string[]): string {
  const parts: string[] = [];
  if (added.length > 0) {
    parts.push(`Added: ${added.slice(0, 3).join(', ')}${added.length > 3 ? ` (+${added.length - 3} more)` : ''}`);
  }
  if (removed.length > 0) {
    parts.push(`Removed: ${removed.slice(0, 3).join(', ')}${removed.length > 3 ? ` (+${removed.length - 3} more)` : ''}`);
  }
  return parts.join('. ') || 'Features changed';
}

function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple Jaccard similarity on word sets
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
}

// ============================================================================
// Main Monitor Function
// ============================================================================

export interface MonitorResult {
  competitor: RaCompetitor;
  success: boolean;
  changesDetected: number;
  error?: string;
}

export async function monitorCompetitor(competitor: RaCompetitor): Promise<MonitorResult> {
  console.log(`Monitoring: ${competitor.name} (${competitor.website_url})`);

  try {
    // Fetch website
    const html = await fetchWebsite(competitor.website_url);

    // Extract content
    const content = extractContent(html, competitor.website_url);
    const contentHash = hashContent(JSON.stringify(content));

    // Get previous snapshot
    const previousSnapshot = await db.getLatestSnapshot(competitor.id);

    // Detect changes
    const changes = detectChanges(previousSnapshot?.content || null, content);

    // Store new snapshot
    await db.storeSnapshot(competitor.id, contentHash, content, 'full');

    // Record changes
    for (const change of changes) {
      if (change.hasChanges && change.changeType) {
        await db.recordChange(
          competitor.id,
          change.changeType,
          change.summary || 'Change detected',
          change.oldValue || null,
          change.newValue || null
        );
      }
    }

    // Update last checked timestamp
    await db.updateCompetitorLastChecked(competitor.id);

    console.log(`  ✅ ${changes.length} change(s) detected`);

    return {
      competitor,
      success: true,
      changesDetected: changes.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Error: ${errorMessage}`);

    return {
      competitor,
      success: false,
      changesDetected: 0,
      error: errorMessage,
    };
  }
}

export async function monitorAllCompetitors(): Promise<MonitorResult[]> {
  const competitors = await db.getAllCompetitors();
  console.log(`\n=== RivalAlert Monitor: ${competitors.length} competitors ===\n`);

  const results: MonitorResult[] = [];

  for (const competitor of competitors) {
    const result = await monitorCompetitor(competitor);
    results.push(result);

    // Small delay between requests to be polite
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const successful = results.filter((r) => r.success).length;
  const totalChanges = results.reduce((sum, r) => sum + r.changesDetected, 0);

  console.log(`\n=== Monitor Complete: ${successful}/${competitors.length} successful, ${totalChanges} changes ===\n`);

  return results;
}
