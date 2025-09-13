#!/usr/bin/env node

/**
 * Migrate Builder Bot UI on the desktop:
 * - Remove the inline "dock-attached widget" block from the desktop HTML
 * - Inject a docked iframe that loads the windowed Builder Bot app
 * - Use safe wrapper (backup + update) and target the TEST desktop by default
 *
 * Idempotent behavior:
 * - If inline widget block is absent, continues safely
 * - If a previous DOCK block exists, it is replaced/updated
 */

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

const INLINE_START = '<!-- BUILDER BOT DOCK-ATTACHED WIDGET START -->';
const INLINE_END   = '<!-- BUILDER BOT DOCK-ATTACHED WIDGET END -->';
const DOCK_START   = '<!-- BUILDER BOT DOCK START -->';
const DOCK_END     = '<!-- BUILDER BOT DOCK END -->';
const BUTTON_START = '<!-- BUILDER BOT DOCK BUTTON START -->';
const BUTTON_END   = '<!-- BUILDER BOT DOCK BUTTON END -->';

function removeInlineWidget(html) {
  const start = html.indexOf(INLINE_START);
  if (start === -1) return html; // nothing to remove
  const end = html.indexOf(INLINE_END, start);
  if (end === -1) return html;   // malformed markers; do not modify
  const before = html.slice(0, start);
  const after = html.slice(end + INLINE_END.length);
  return before + after;
}

function buildDockSnippet() {
  const cb = Date.now(); // cache-buster
  // Bottom-right, widget-sized, frameless iframe that feels like a desktop-attached widget
  return `\n${DOCK_START}\n<style>
  .builder-bot-dock { 
    position: fixed; 
    right: 20px; 
    /* Lift above the dock clock bubble */
    bottom: 64px; 
    /* Match app meta (width=420,height=520) and allow internal 20px right offset */
    width: 420px; 
    height: 520px; 
    z-index: 2147483000; 
    pointer-events: none; /* allow clicks only inside iframe */
  }
  .builder-bot-frame { 
    width: 100%; 
    height: 100%; 
    border: 0; 
    background: transparent; 
    /* No extra chrome here; the app renders its own rounded widget */
    pointer-events: all; /* restore interactions inside */
  }
</style>
<div class="builder-bot-dock" id="builderBotDock">
  <iframe 
    class="builder-bot-frame" 
    src="/api/wtaf/raw?user=public&slug=toybox-builder-bot&v=${cb}" 
    loading="lazy" 
    referrerpolicy="no-referrer"
    title="Builder Bot"
  ></iframe>
  <script>
    // Toggle visibility via dock button; default open on first load
    (function(){
      function init() {
        var dock = document.getElementById('builderBotDock');
        var button = document.getElementById('builderBotDockBtn');
        if (!dock) return;
        var isOpen = true;
        try { localStorage.setItem('builderbot_open', 'true'); } catch(e) {}
        function render(){
          dock.style.display = isOpen ? 'block' : 'none';
          if (button){
            button.classList.toggle('active', isOpen);
            button.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
          }
        }
        if (button){
          button.addEventListener('click', function(){
            isOpen = !isOpen;
            localStorage.setItem('builderbot_open', isOpen ? 'true' : 'false');
            render();
          });
        }
        // Listen for visibility changes from the iframe (e.g., close button)
        window.addEventListener('message', function(evt){
          try {
            var data = evt.data || {};
            if (data && data.type === 'BUILDER_BOT_VISIBILITY') {
              isOpen = !!data.open;
              try { localStorage.setItem('builderbot_open', isOpen ? 'true' : 'false'); } catch(e) {}
              render();
            }
          } catch (e) { /* ignore */ }
        });
        render();
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else { init(); }
    })();
  </script>
</div>
${DOCK_END}\n`;
}

function upsertDock(html) {
  const snippet = buildDockSnippet();

  // If a dock block already exists, replace it entirely to ensure consistency
  const existingStart = html.indexOf(DOCK_START);
  if (existingStart !== -1) {
    const existingEnd = html.indexOf(DOCK_END, existingStart);
    if (existingEnd !== -1) {
      const before = html.slice(0, existingStart);
      const after = html.slice(existingEnd + DOCK_END.length);
      return before + snippet + after;
    }
  }

  // Otherwise, insert before </body>
  const idx = html.lastIndexOf('</body>');
  if (idx === -1) return html + snippet;
  return html.slice(0, idx) + snippet + html.slice(idx);
}

function insertDockButton(html) {
  const buttonHtml = `\n${BUTTON_START}\n<div class="taskbar-app" id="builderBotDockBtn" title="Builder Bot" role="button" aria-pressed="true">🤖</div>\n${BUTTON_END}\n`;
  // Replace existing block between markers if present
  if (html.includes(BUTTON_START)) {
    const start = html.indexOf(BUTTON_START);
    const end = html.indexOf(BUTTON_END, start);
    if (end !== -1) {
      const before = html.slice(0, start);
      const after = html.slice(end + BUTTON_END.length);
      return before + buttonHtml + after;
    }
  }
  // Place before the clock widget in the taskbar
  const clockMarker = '<div class="clock-widget" id="menu-time"';
  const idx = html.indexOf(clockMarker);
  if (idx === -1) return html; // if not found, skip button injection
  return html.slice(0, idx) + buttonHtml + html.slice(idx);
}

async function main() {
  // Step 1: Fetch current TEST desktop (toybox-os-v3-test)
  const isTest = true;
  const current = await fetchCurrentDesktop(isTest);
  let html = current.html_content;

  // Step 2: Remove inline widget (if present)
  const withoutInline = removeInlineWidget(html);

  // Step 3: Insert/replace docked iframe
  let withDock = upsertDock(withoutInline);

  // Step 4: Insert dock button next to the clock
  withDock = insertDockButton(withDock);

  if (withDock === html) {
    console.log('ℹ️  No changes applied (desktop already migrated).');
    return;
  }

  // Step 5: Safe update with backup
  await safeUpdateDesktop(withDock, 'Migrate Builder Bot: remove inline widget, add docked iframe', isTest);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
}
