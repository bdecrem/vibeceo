#!/usr/bin/env node

/**
 * One-time setup script for the cloned desktop:
 * - Links public/webtoys-os to the "System 7 WOS" theme
 * - Isolates ZAD persistence keys: toybox-desktop-layout → webtoys-desktop-layout
 * - Creates a local backup of the current HTML
 *
 * Safe: Only touches app_slug = 'webtoys-os'.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load env from sms-bot/.env.local (resolve relative to this script file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envCandidates = [
  path.resolve(__dirname, '../../.env.local'), // sms-bot/.env.local
  path.resolve(__dirname, '../../.env'),       // sms-bot/.env
  path.resolve(process.cwd(), '.env.local'),   // CWD fallback
  path.resolve(process.cwd(), '.env')          // CWD fallback
];

let loaded = false;
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    const res = dotenv.config({ path: envPath });
    if (!res.error) {
      loaded = true;
      break;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_KEY). Ensure sms-bot/.env.local exists and contains these keys.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('\n=== Webtoys OS setup (clone) ===');

  // 1) Resolve theme id for "System 7 WOS"
  console.log('🔎 Looking up theme id for "System 7 WOS"...');
  const { data: theme, error: themeErr } = await supabase
    .from('wtaf_themes')
    .select('id, name')
    .eq('name', 'System 7 WOS')
    .single();

  if (themeErr) {
    console.error('❌ Failed to fetch theme:', themeErr.message);
    process.exit(1);
  }
  const themeId = theme.id;
  console.log('🎯 Theme ID:', themeId);

  // 2) Fetch current webtoys-os row
  console.log('🔎 Fetching current public/webtoys-os...');
  const { data: row, error: rowErr } = await supabase
    .from('wtaf_content')
    .select('id, html_content, theme_id, updated_at')
    .eq('user_slug', 'public')
    .eq('app_slug', 'webtoys-os')
    .single();

  if (rowErr) {
    console.error('❌ Failed to fetch webtoys-os:', rowErr.message);
    process.exit(1);
  }

  // 3) Backup current HTML locally
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const backupPath = path.join(backupDir, `webtoys-os_${timestamp}.html`);
  fs.writeFileSync(backupPath, row.html_content || '');
  console.log('💾 Backup saved:', backupPath);

  // 4) Update HTML: isolate ZAD keys
  let newHtml = row.html_content || '';
  const before = newHtml;
  // Replace any occurrences of the desktop layout app_id
  newHtml = newHtml.replace(/app_id=toybox-desktop-layout/g, 'app_id=webtoys-desktop-layout');
  // Optional: replace hard-coded mentions if present in code (defensive)
  newHtml = newHtml.replace(/['\"]toybox-desktop-layout['\"]/g, '"webtoys-desktop-layout"');

  const changed = before !== newHtml;
  console.log(changed ? '🛠️  Updated ZAD keys in HTML' : 'ℹ️  No ZAD key changes detected');

  // 5) Apply updates in Supabase (theme_id and possibly html_content)
  console.log('🚀 Applying updates to Supabase (clone only)...');
  const updates = {
    theme_id: themeId,
    updated_at: new Date().toISOString(),
  };
  if (changed) {
    updates.html_content = newHtml;
  }

  const { error: updErr } = await supabase
    .from('wtaf_content')
    .update(updates)
    .eq('user_slug', 'public')
    .eq('app_slug', 'webtoys-os');

  if (updErr) {
    console.error('❌ Update failed:', updErr.message);
    process.exit(1);
  }

  // 6) Save latest copy locally for quick reference
  const latestPath = path.join(process.cwd(), 'current-webtoys-os.html');
  fs.writeFileSync(latestPath, newHtml);
  console.log('📄 Wrote latest HTML to:', latestPath);

  console.log('\n✅ Done! View at: https://webtoys.ai/public/webtoys-os');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});


