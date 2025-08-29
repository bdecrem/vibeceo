#!/usr/bin/env node

/**
 * Modernize the cloned theme "System 7 WOS" without touching the original theme.
 * - Fetches theme by name
 * - Creates a local backup of css_content
 * - Appends modern CSS overrides targeting `.theme-system7` selectors
 * - Updates wtaf_themes.css_content for the WOS theme only
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envCandidates = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env')
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_KEY)');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function buildModernOverrides() {
  return `
/* ================= Modern WOS Overrides (non-breaking) ================= */
/* Typography & tokens */
@supports (font-variation-settings: normal) {
  .theme-system7 { --wos-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Inter, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
}
.theme-system7 { 
  --wos-radius-outer: 14px; 
  --wos-radius-inner: 10px; 
  --wos-shadow-1: 0 10px 20px rgba(0,0,0,0.10);
  --wos-shadow-2: 0 2px 8px rgba(0,0,0,0.06);
  --wos-border: rgba(0,0,0,0.08);
  --wos-panel: rgba(255,255,255,0.85);
  --wos-panel-strong: rgba(255,255,255,0.95);
  --wos-glass: rgba(255,255,255,0.6);
  --wos-text: #0f172a;
  --wos-text-muted: #475569;
}

/* Menu bar */
.theme-system7 .menu-bar {
  height: 48px;
  line-height: 48px;
  background: var(--wos-glass);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  backdrop-filter: blur(12px) saturate(1.2);
  border-bottom: 1px solid var(--wos-border);
  color: var(--wos-text);
}
.theme-system7 .menu-title, .theme-system7 #menu-clock {
  font-family: var(--wos-font), sans-serif;
  font-size: 14px;
  color: var(--wos-text);
}
.theme-system7 .menu-title:hover, .theme-system7 #menu-clock:hover {
  background: rgba(0,0,0,0.08);
  color: var(--wos-text);
}
.theme-system7 .dropdown-menu {
  border-radius: 10px;
  border: 1px solid var(--wos-border);
  box-shadow: var(--wos-shadow-1);
}
.theme-system7 .menu-item { font-family: var(--wos-font), sans-serif; }

/* Desktop */
body.theme-system7 { 
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  color: var(--wos-text);
  font-family: var(--wos-font), sans-serif;
  -webkit-font-smoothing: antialiased;
  image-rendering: auto;
}

/* Windows */
.theme-system7 .desktop-window {
  background: var(--wos-panel);
  border: 1px solid var(--wos-border);
  border-radius: var(--wos-radius-outer);
  box-shadow: var(--wos-shadow-1), var(--wos-shadow-2);
  overflow: hidden;
}
.theme-system7 .desktop-window.active {
  box-shadow: 0 20px 40px rgba(0,0,0,0.18), var(--wos-shadow-2);
  border-color: rgba(99,102,241,0.25);
}
.theme-system7 .window-titlebar {
  height: 36px;
  background: linear-gradient(180deg, var(--wos-panel-strong), rgba(255,255,255,0.75));
  color: var(--wos-text);
  cursor: default;
}
.theme-system7 .window-title { font-weight: 600; font-size: 13px; }
.theme-system7 .window-content {
  background: white;
  border: none;
}

/* Window controls */
.theme-system7 .window-controls { gap: 6px; }
.theme-system7 .window-controls button {
  width: 18px; height: 18px; border-radius: 999px; border: 1px solid var(--wos-border);
  background: #f1f5f9; transition: transform .12s ease, background .12s ease;
}
.theme-system7 .window-controls button:hover { transform: translateY(-1px); background: #e2e8f0; }
.theme-system7 .window-controls .window-close { background: #fecaca; border-color: #fda4af; }
.theme-system7 .window-controls .window-maximize { background: #bbf7d0; border-color: #86efac; }
.theme-system7 .window-controls .window-minimize { background: #fde68a; border-color: #fcd34d; }

/* Desktop icons */
.theme-system7 .desktop-icon { gap: 8px; width: 88px; }
.theme-system7 .desktop-icon .icon { font-size: 44px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.15)); }
.theme-system7 .desktop-icon .label { font-size: 13px; color: var(--wos-text-muted); }
.theme-system7 .desktop-icon:hover { background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.25); border-radius: 10px; }
.theme-system7 .desktop-icon.selected { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.35); }

/* Scrollbars inside windows */
.theme-system7 .window-content::-webkit-scrollbar { width: 12px; }
.theme-system7 .window-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 3px solid white; }
.theme-system7 .window-content::-webkit-scrollbar-track { background: transparent; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .theme-system7 * { transition: none !important; animation: none !important; }
}
/* ================= End Modern WOS Overrides ================= */
`;
}

async function main() {
  console.log('\n=== Modernize System 7 WOS Theme ===');

  // Fetch theme
  const { data: theme, error } = await supabase
    .from('wtaf_themes')
    .select('id, name, css_content, updated_at')
    .eq('name', 'System 7 WOS')
    .single();
  if (error) { console.error('❌ Failed to fetch theme:', error.message); process.exit(1); }

  const backupDir = path.join(process.cwd(), 'backups', 'themes');
  fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const backupPath = path.join(backupDir, `${theme.id}_${ts}.css`);
  fs.writeFileSync(backupPath, theme.css_content || '', 'utf8');
  console.log('💾 Theme CSS backup:', backupPath);

  const overrides = buildModernOverrides();
  const newCss = `${theme.css_content || ''}\n\n${overrides}`;

  const { error: updErr } = await supabase
    .from('wtaf_themes')
    .update({ css_content: newCss, updated_at: new Date().toISOString() })
    .eq('id', theme.id);
  if (updErr) { console.error('❌ Failed to update theme:', updErr.message); process.exit(1); }

  const latestPath = path.join(backupDir, `${theme.id}_latest.css`);
  fs.writeFileSync(latestPath, newCss, 'utf8');
  console.log('✅ Theme updated. Latest saved:', latestPath);
  console.log('🔗 Test at: https://webtoys.ai/public/webtoys-os');
}

main().catch(e => { console.error('❌ Unexpected error:', e); process.exit(1); });


