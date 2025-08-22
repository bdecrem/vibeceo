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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('❌ Missing Supabase credentials'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function buildPolishCss() {
  return `
/* ================= WOS Polish v2 (theme-only) ================= */
.theme-system7 { --wos-accent: #6366f1; --wos-accent-weak: rgba(99,102,241,0.15); }

/* Window open/close subtle motion */
.theme-system7 .desktop-window { animation: wos-fade-in .16s ease-out; }
@keyframes wos-fade-in { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }

/* Focus ring + accent */
.theme-system7 .desktop-window.active { outline: 2px solid var(--wos-accent-weak); outline-offset: 0; }
.theme-system7 .window-titlebar { border-bottom: 1px solid rgba(0,0,0,0.06); }
.theme-system7 .desktop-window.active .window-titlebar {
  background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.70));
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}
.theme-system7 .window-title { letter-spacing: .2px; }

/* Hover affordances */
.theme-system7 .window-controls button:hover { box-shadow: 0 1px 2px rgba(0,0,0,0.12); }
.theme-system7 .window-controls .window-close:hover { filter: saturate(1.1); }

/* Icon grid improvements */
.theme-system7 .desktop-icon { transition: transform .12s ease, background .12s ease, border-color .12s ease; }
.theme-system7 .desktop-icon:hover { transform: translateY(-1px); }
.theme-system7 .desktop-icon.selected { box-shadow: 0 2px 8px rgba(99,102,241,.18); }

/* Menu spacing & separators */
.theme-system7 .menu-left, .theme-system7 .menu-right { gap: 14px; }
.theme-system7 .menu-bar::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: rgba(0,0,0,0.06); }

/* Scrollbar accent on hover */
.theme-system7 .window-content:hover::-webkit-scrollbar-thumb { background: #94a3b8; }

/* Responsive tweaks */
@media (max-width: 900px) {
  .theme-system7 .menu-bar { height: 44px; line-height: 44px; }
  .theme-system7 .desktop-icon { width: 80px; }
  .theme-system7 .desktop-icon .icon { font-size: 36px; }
  .theme-system7 .desktop-window { border-radius: 10px; }
}
/* ================= End WOS Polish v2 ================= */
`;
}

async function main() {
  console.log('🎨 Applying WOS Polish v2');
  const { data: theme, error } = await supabase
    .from('wtaf_themes')
    .select('id, name, css_content')
    .eq('name', 'System 7 WOS')
    .single();
  if (error) { console.error('Theme fetch failed:', error.message); process.exit(1); }

  const backupDir = path.join(process.cwd(), 'backups', 'themes');
  fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  fs.writeFileSync(path.join(backupDir, `${theme.id}_${ts}_before.css`), theme.css_content || '', 'utf8');

  const newCss = `${theme.css_content || ''}\n\n${buildPolishCss()}`;
  const { error: updErr } = await supabase
    .from('wtaf_themes')
    .update({ css_content: newCss, updated_at: new Date().toISOString() })
    .eq('id', theme.id);
  if (updErr) { console.error('Update failed:', updErr.message); process.exit(1); }

  fs.writeFileSync(path.join(backupDir, `${theme.id}_latest.css`), newCss, 'utf8');
  console.log('✅ WOS Polish v2 applied. Visit https://webtoys.ai/public/webtoys-os');
}

main().catch(e => { console.error('Unexpected:', e); process.exit(1); });


