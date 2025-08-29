#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envCandidates = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env')
];
for (const p of envCandidates) { if (fs.existsSync(p)) { dotenv.config({ path: p }); break; } }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const slug = process.argv[2] || 'webtoys-os';

const needle = 'wos-enhancements';
const menuNeedle = 'menu-dropdown';
const marqueeNeedle = 'selection-marquee';

const { data, error } = await supabase
  .from('wtaf_content')
  .select('id, app_slug, updated_at, html_content')
  .eq('user_slug', 'public')
  .eq('app_slug', slug)
  .single();

if (error) {
  console.error('❌ Fetch failed:', error.message);
  process.exit(1);
}

const html = data?.html_content || '';
console.log('slug:', data.app_slug, 'updated_at:', data.updated_at);
console.log('length:', html.length);
console.log('contains wos-enhancements:', html.includes(needle));
console.log('contains menu-dropdown:', html.includes(menuNeedle));
console.log('contains selection-marquee:', html.includes(marqueeNeedle));

// Save a local copy for inspection
const outDir = path.join(process.cwd(), 'backups');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `check-${slug}.html`);
fs.writeFileSync(outFile, html, 'utf8');
console.log('saved to:', outFile);


