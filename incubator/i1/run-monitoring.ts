/**
 * Manual runner for RivalAlert monitoring
 * Run with: cd sms-bot && npx tsx ../incubator/i1/run-monitoring.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from sms-bot/.env.local
dotenv.config({ path: join(__dirname, '../../sms-bot/.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const FROM_EMAIL = process.env.RIVALALERT_FROM_EMAIL || 'bot@advisorsfoundry.ai';

console.log('Environment check:');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅' : '❌');

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

interface RaCompetitor {
  id: string;
  user_id: string;
  name: string;
  website_url: string;
}

interface SnapshotContent {
  title?: string;
  description?: string;
  pricing?: Array<{ plan_name: string; price: string; period?: string }>;
  features?: string[];
  raw_text?: string;
  html_hash: string;
}

async function fetchWebsite(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
    description: $('meta[name="description"]').attr('content')?.trim() || undefined,
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
      const planName = $(el).find('h2, h3, h4, [class*="title"]').first().text().trim() || 'Plan';
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

async function runMonitoring() {
  const supabase = getSupabase();

  // Get all competitors
  const { data: competitors, error } = await supabase.from('ra_competitors').select('*');

  if (error) {
    console.error('Error fetching competitors:', error);
    return;
  }

  console.log(`\nMonitoring ${competitors?.length || 0} competitor(s)...\n`);

  let totalChanges = 0;

  for (const comp of competitors || []) {
    try {
      console.log(`Monitoring: ${comp.name} (${comp.website_url})`);

      const html = await fetchWebsite(comp.website_url);
      const content = extractContent(html);
      const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');

      // Get previous snapshot
      const { data: prevSnapshot } = await supabase
        .from('ra_snapshots')
        .select('*')
        .eq('competitor_id', comp.id)
        .order('captured_at', { ascending: false })
        .limit(1)
        .single();

      const changes = detectChanges(prevSnapshot?.content || null, content);

      // Store new snapshot
      await supabase.from('ra_snapshots').insert({
        competitor_id: comp.id,
        content_hash: contentHash,
        content,
      });

      // Record changes
      for (const change of changes) {
        await supabase.from('ra_changes').insert({
          competitor_id: comp.id,
          change_type: change.type,
          summary: change.summary,
          old_value: change.old,
          new_value: change.new,
        });
      }

      console.log(`  ✅ ${changes.length} change(s)`);
      totalChanges += changes.length;

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ❌ Error:`, err);
    }
  }

  console.log(`\nMonitoring complete: ${competitors?.length || 0} checked, ${totalChanges} changes\n`);

  // Now send digests
  await sendDigests();
}

async function sendDigests() {
  const supabase = getSupabase();

  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not set, skipping digests');
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const now = new Date().toISOString();

  // Get active users
  const { data: users, error } = await supabase
    .from('ra_users')
    .select('*')
    .or(`plan.neq.trial,trial_ends_at.gt.${now}`);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log(`Sending digests to ${users?.length || 0} active user(s)...\n`);

  for (const user of users || []) {
    try {
      // Get recent unnotified changes for this user
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data: changes } = await supabase
        .from('ra_changes')
        .select(`
          *,
          ra_competitors!inner (
            id,
            name,
            website_url,
            user_id
          )
        `)
        .eq('ra_competitors.user_id', user.id)
        .gte('detected_at', since.toISOString())
        .eq('notified', false)
        .order('detected_at', { ascending: false });

      if (!changes || changes.length === 0) {
        console.log(`No changes for ${user.email}, skipping`);
        continue;
      }

      const changesHtml = changes
        .map(c => `
          <div style="background:#f8f9fa;padding:12px;margin:8px 0;border-left:4px solid #ff6b35;border-radius:4px">
            <strong>${c.ra_competitors?.name || 'Competitor'}</strong>
            <p style="margin:4px 0;font-size:14px">${c.summary}</p>
          </div>
        `)
        .join('');

      const html = `
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

      await sgMail.send({
        to: user.email,
        from: { email: FROM_EMAIL, name: 'RivalAlert' },
        subject: `🔔 RivalAlert: ${changes.length} change(s) detected`,
        html,
      });

      // Mark changes as notified
      const changeIds = changes.map(c => c.id);
      await supabase.from('ra_changes').update({ notified: true }).in('id', changeIds);

      console.log(`📧 Digest sent to ${user.email} (${changes.length} changes)`);
    } catch (err) {
      console.error(`Failed to send to ${user.email}:`, err);
    }
  }
}

runMonitoring()
  .then(() => console.log('\nDone!'))
  .catch(err => console.error('Error:', err));
