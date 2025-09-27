#!/usr/bin/env node

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

function buildPatchedHtml(html) {
  const fnRegex = /async function checkBuilderBotSession\s*\([^)]*\)\s*\{[\s\S]*?\}\n/;
  if (!fnRegex.test(html)) {
    throw new Error('Could not find checkBuilderBotSession() in desktop HTML');
  }
  const replacement = `async function checkBuilderBotSession() {
    try {
      // Load latest lock state from ZAD (authoritative)
      const lockRes = await fetch('/api/zad/load?app_id=toybox-builder-bot&action_type=lock');
      const locks = await lockRes.json();
      // Find latest lock row by created_at
      const latest = (locks || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      // Get current user info
      const currentUser = (function(){
        try { return JSON.parse(localStorage.getItem('toybox_user') || 'null'); } catch(_) { return null; }
      })();
      const myId = currentUser && currentUser.handle && currentUser.pin
        ? (currentUser.handle.toUpperCase() + '_' + currentUser.pin)
        : null;
      
      const lockedBy = latest && (latest.locked_by || latest.content_data?.locked_by);
      const expiresAt = latest && (latest.expires_at || latest.content_data?.expires_at);
      const isActive = lockedBy && (!expiresAt || new Date(expiresAt) > new Date());
      const iAmHolder = isActive && myId && (lockedBy === myId || lockedBy.split('_')[0] === myId.split('_')[0]);
      
      if (isActive && !iAmHolder) {
        // Enter spectator mode for other holder
        const messagesRes = await fetch('/api/zad/load?app_id=toybox-builder-bot&action_type=chat_message');
        const recentMessages = await messagesRes.json();
        enterSpectatorMode(lockedBy, recentMessages || []);
      } else if (!isActive && window.isSpectator) {
        // Lock cleared, exit spectator
        exitSpectatorMode();
      } else if (iAmHolder && window.isSpectator) {
        // I regained control
        exitSpectatorMode();
      }
    } catch (error) {
      console.error('Error checking Builder Bot session (lock-based):', error);
    }
  }\n`;
  return html.replace(fnRegex, replacement);
}

async function main() {
  console.log('🔧 Patching desktop HTML (lock-based Builder Bot session)...');
  const current = await fetchCurrentDesktop(true);
  const patched = buildPatchedHtml(current.html_content);
  await safeUpdateDesktop(patched, 'Switch Builder Bot session to lock-based detection', true);
}

main().catch(err => { console.error('❌ Patch failed:', err.message); process.exit(1); });

