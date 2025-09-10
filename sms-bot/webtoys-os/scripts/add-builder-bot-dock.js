#!/usr/bin/env node

/**
 * Injects the Builder Bot dock (bottom-attached iframe) into the desktop HTML using the safe wrapper.
 * - Adds a fixed bottom bar with an iframe pointing to /public/toybox-builder-bot
 * - Idempotent: if the marker is present, updates or skips
 */

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

function injectDock(html) {
  if (html.includes('<!-- BUILDER BOT DOCK START -->')) {
    return html; // already present
  }

  const snippet = `\n<!-- BUILDER BOT DOCK START -->\n<style>
  .builder-bot-dock { position: fixed; left: 0; right: 0; bottom: 0; height: 52px; z-index: 2147483000; }
  .builder-bot-frame { width: 100%; height: 100%; border: 0; background: transparent; }
</style>
<div class="builder-bot-dock">
  <iframe class="builder-bot-frame" src="/public/toybox-builder-bot" loading="lazy" referrerpolicy="no-referrer"></iframe>
</div>
<!-- BUILDER BOT DOCK END -->\n`;

  // Insert before </body>
  const idx = html.lastIndexOf('</body>');
  if (idx === -1) return html + snippet;
  return html.slice(0, idx) + snippet + html.slice(idx);
}

async function main() {
  const isTest = true; // attach to test desktop first
  const current = await fetchCurrentDesktop(isTest);
  const html = current.html_content;
  const updated = injectDock(html);
  if (updated === html) {
    console.log('ℹ️  Builder Bot dock already present. No changes made.');
    return;
  }
  await safeUpdateDesktop(updated, 'Add Builder Bot bottom dock', isTest);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
}

