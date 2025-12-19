/**
 * RivalAlert Daily Scheduler
 *
 * Runs at 7:00 AM PT daily:
 * 1. Monitors all competitor websites for changes
 * 2. Sends email digests to users with active trials
 *
 * This is the sms-bot integration for the RivalAlert product (incubator/i1).
 */

import { registerDailyJob } from '../../lib/scheduler/index.js';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import sgMail from '@sendgrid/mail';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const DEFAULT_HOUR = 7; // 7 AM PT
const DEFAULT_MINUTE = 0;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 30000;
const FROM_EMAIL = process.env.RIVALALERT_FROM_EMAIL || 'alerts@rivalalert.ai';

// ============================================================================
// Database Functions
// ============================================================================

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

interface RaUser {
  id: string;
  email: string;
  plan: string;
  trial_ends_at: string | null;
}

interface RaCompetitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
}

interface RaSnapshot {
  id: string;
  competitor_id: string;
  content: SnapshotContent;
}

interface SnapshotContent {
  title?: string;
  description?: string;
  pricing?: Array<{ plan_name: string; price: string; period?: string }>;
  features?: string[];
  raw_text?: string;
  html_hash: string;
}

async function getActiveUsers(): Promise<RaUser[]> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('ra_users')
    .select('*')
    .or(`plan.neq.trial,trial_ends_at.gt.${now}`);

  if (error) {
    console.error('[rivalalert] Error fetching users:', error);
    return [];
  }

  return data || [];
}

async function getCompetitorsByUser(userId: string): Promise<RaCompetitor[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ra_competitors')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[rivalalert] Error fetching competitors:', error);
    return [];
  }

  return data || [];
}

async function getAllCompetitors(): Promise<RaCompetitor[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase.from('ra_competitors').select('*');

  if (error) {
    console.error('[rivalalert] Error fetching all competitors:', error);
    return [];
  }

  return data || [];
}

async function getLatestSnapshot(competitorId: string): Promise<RaSnapshot | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ra_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[rivalalert] Error fetching snapshot:', error);
  }

  return data || null;
}

async function storeSnapshot(
  competitorId: string,
  contentHash: string,
  content: SnapshotContent
): Promise<void> {
  const supabase = getSupabase();

  await supabase.from('ra_snapshots').insert({
    competitor_id: competitorId,
    content_hash: contentHash,
    content,
  });
}

async function recordChange(
  competitorId: string,
  changeType: string,
  summary: string,
  oldValue: unknown,
  newValue: unknown
): Promise<void> {
  const supabase = getSupabase();

  await supabase.from('ra_changes').insert({
    competitor_id: competitorId,
    change_type: changeType,
    summary,
    old_value: oldValue,
    new_value: newValue,
  });
}

async function getRecentChanges(userId: string, since: Date): Promise<any[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ra_changes')
    .select(
      `
      *,
      ra_competitors!inner (
        id,
        name,
        url,
        user_id
      )
    `
    )
    .eq('ra_competitors.user_id', userId)
    .gte('created_at', since.toISOString())
    .eq('notified', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[rivalalert] Error fetching changes:', error);
    return [];
  }

  return data || [];
}

async function markChangesNotified(changeIds: string[]): Promise<void> {
  if (changeIds.length === 0) return;

  const supabase = getSupabase();

  await supabase.from('ra_changes').update({ notified: true }).in('id', changeIds);
}

// ============================================================================
// Website Monitoring
// ============================================================================

async function fetchWebsite(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractContent(html: string): SnapshotContent {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe').remove();

  return {
    title: $('title').text().trim() || undefined,
    description:
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      undefined,
    pricing: extractPricing($),
    features: extractFeatures($),
    raw_text: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000),
    html_hash: createHash('sha256').update(html).digest('hex'),
  };
}

function extractPricing($: cheerio.CheerioAPI): SnapshotContent['pricing'] {
  const pricing: NonNullable<SnapshotContent['pricing']> = [];
  const selectors = '[class*="pricing"], [class*="price"], [class*="plan"]';

  $(selectors).each((_, el) => {
    const text = $(el).text();
    const priceMatch = text.match(/\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year))?/i);

    if (priceMatch) {
      const planName =
        $(el).find('h2, h3, h4, [class*="title"]').first().text().trim() || 'Plan';
      pricing.push({
        plan_name: planName.slice(0, 100),
        price: priceMatch[0],
        period: text.match(/\/(mo|month|yr|year)/i)?.[1],
      });
    }
  });

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
  const selectors = '[class*="feature"] li, [class*="benefit"] li, .features li';

  $(selectors).each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 200) {
      features.push(text);
    }
  });

  return [...new Set(features)].slice(0, 30);
}

function detectChanges(
  oldContent: SnapshotContent | null,
  newContent: SnapshotContent
): Array<{ type: string; summary: string; old: unknown; new: unknown }> {
  const changes: Array<{ type: string; summary: string; old: unknown; new: unknown }> = [];

  if (!oldContent) return [];

  // Pricing changes
  const oldPricing = JSON.stringify(oldContent.pricing || []);
  const newPricing = JSON.stringify(newContent.pricing || []);
  if (oldPricing !== newPricing && newContent.pricing?.length) {
    changes.push({
      type: 'pricing',
      summary: `Pricing updated: ${newContent.pricing.map((p) => `${p.plan_name}: ${p.price}`).join(', ')}`,
      old: oldContent.pricing,
      new: newContent.pricing,
    });
  }

  // Feature changes
  const oldFeatures = new Set(oldContent.features || []);
  const newFeatures = new Set(newContent.features || []);
  const added = [...newFeatures].filter((f) => !oldFeatures.has(f));
  if (added.length > 0) {
    changes.push({
      type: 'feature',
      summary: `New features: ${added.slice(0, 3).join(', ')}${added.length > 3 ? ` (+${added.length - 3} more)` : ''}`,
      old: oldContent.features,
      new: newContent.features,
    });
  }

  // General content change
  if (changes.length === 0 && oldContent.html_hash !== newContent.html_hash) {
    changes.push({
      type: 'content',
      summary: 'Website content changed',
      old: { hash: oldContent.html_hash },
      new: { hash: newContent.html_hash },
    });
  }

  return changes;
}

async function monitorCompetitor(competitor: RaCompetitor): Promise<number> {
  try {
    console.log(`[rivalalert] Monitoring: ${competitor.name} (${competitor.url})`);

    const html = await fetchWebsite(competitor.url);
    const content = extractContent(html);
    const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');

    const previousSnapshot = await getLatestSnapshot(competitor.id);
    const changes = detectChanges(previousSnapshot?.content || null, content);

    await storeSnapshot(competitor.id, contentHash, content);

    for (const change of changes) {
      await recordChange(competitor.id, change.type, change.summary, change.old, change.new);
    }

    console.log(`[rivalalert]   ✅ ${changes.length} change(s)`);
    return changes.length;
  } catch (error) {
    console.error(`[rivalalert]   ❌ Error:`, error);
    return 0;
  }
}

async function monitorAllCompetitors(): Promise<{ checked: number; changes: number }> {
  const competitors = await getAllCompetitors();
  console.log(`[rivalalert] Monitoring ${competitors.length} competitor(s)...`);

  let totalChanges = 0;
  for (const competitor of competitors) {
    totalChanges += await monitorCompetitor(competitor);
    await new Promise((r) => setTimeout(r, 1000)); // Rate limit
  }

  return { checked: competitors.length, changes: totalChanges };
}

// ============================================================================
// Email Digests
// ============================================================================

function initSendGrid(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error('[rivalalert] SENDGRID_API_KEY not set');
    return false;
  }
  sgMail.setApiKey(apiKey);
  return true;
}

function generateDigestHtml(user: RaUser, changes: any[]): string {
  if (changes.length === 0) {
    return `
<!DOCTYPE html>
<html>
<head><style>body{font-family:system-ui;max-width:600px;margin:0 auto;padding:20px}</style></head>
<body>
  <h1 style="color:#ff6b35">🔔 RivalAlert Daily Digest</h1>
  <p>No changes detected from your competitors in the last 24 hours.</p>
  <p style="color:#666;font-size:12px">Manage at <a href="https://rivalalert.ai">rivalalert.ai</a></p>
</body>
</html>`;
  }

  const changesHtml = changes
    .map(
      (c) => `
    <div style="background:#f8f9fa;padding:12px;margin:8px 0;border-left:4px solid #ff6b35;border-radius:4px">
      <strong>${c.ra_competitors?.name || 'Competitor'}</strong>
      <p style="margin:4px 0;font-size:14px">${c.summary}</p>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><style>body{font-family:system-ui;max-width:600px;margin:0 auto;padding:20px}</style></head>
<body>
  <h1 style="color:#ff6b35">🔔 RivalAlert Daily Digest</h1>
  <p>${changes.length} change(s) detected:</p>
  ${changesHtml}
  <p style="color:#666;font-size:12px;margin-top:24px">Manage at <a href="https://rivalalert.ai">rivalalert.ai</a></p>
</body>
</html>`;
}

async function sendDigestToUser(user: RaUser): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const changes = await getRecentChanges(user.id, since);

    // Only send if there are changes (or if we want to send "no changes" emails)
    if (changes.length === 0) {
      console.log(`[rivalalert] No changes for ${user.email}, skipping email`);
      return true;
    }

    await sgMail.send({
      to: user.email,
      from: { email: FROM_EMAIL, name: 'RivalAlert' },
      subject: `🔔 RivalAlert: ${changes.length} change(s) detected`,
      html: generateDigestHtml(user, changes),
    });

    const changeIds = changes.map((c) => c.id);
    await markChangesNotified(changeIds);

    console.log(`[rivalalert] 📧 Digest sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error(`[rivalalert] Failed to send to ${user.email}:`, error);
    return false;
  }
}

async function sendAllDigests(): Promise<{ sent: number; failed: number }> {
  if (!initSendGrid()) {
    return { sent: 0, failed: 0 };
  }

  const users = await getActiveUsers();
  console.log(`[rivalalert] Sending digests to ${users.length} active user(s)...`);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const success = await sendDigestToUser(user);
    if (success) sent++;
    else failed++;
    await new Promise((r) => setTimeout(r, 200));
  }

  return { sent, failed };
}

// ============================================================================
// Scheduler Registration
// ============================================================================

export function registerRivalAlertDailyJob(): void {
  registerDailyJob({
    name: 'rivalalert-daily',
    hour: DEFAULT_HOUR,
    minute: DEFAULT_MINUTE,
    timezone: 'America/Los_Angeles',
    async run() {
      console.log('[rivalalert] Starting daily job...');

      try {
        // Step 1: Monitor all competitors
        const { checked, changes } = await monitorAllCompetitors();
        console.log(`[rivalalert] Monitoring complete: ${checked} checked, ${changes} changes`);

        // Step 2: Send digests
        const { sent, failed } = await sendAllDigests();
        console.log(`[rivalalert] Digests complete: ${sent} sent, ${failed} failed`);

        console.log('[rivalalert] Daily job complete.');
      } catch (error) {
        console.error('[rivalalert] Daily job failed:', error);
        throw error;
      }
    },
    onError(error) {
      console.error('[rivalalert] Scheduler error:', error);
    },
  });

  console.log(`[rivalalert] Registered daily job for ${DEFAULT_HOUR}:${String(DEFAULT_MINUTE).padStart(2, '0')} PT`);
}

// ============================================================================
// Manual Run (for testing)
// ============================================================================

export async function runRivalAlertManually(): Promise<void> {
  console.log('[rivalalert] Running manually...');
  const { checked, changes } = await monitorAllCompetitors();
  console.log(`[rivalalert] Monitoring: ${checked} checked, ${changes} changes`);
  const { sent, failed } = await sendAllDigests();
  console.log(`[rivalalert] Digests: ${sent} sent, ${failed} failed`);
}
