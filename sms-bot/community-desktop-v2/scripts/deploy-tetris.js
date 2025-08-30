#!/usr/bin/env node

/**
 * Deploy TETRIS app and register it with ToyBox OS (WebtoysOS)
 * - Inserts/updates public/webtoysos-tetris HTML in Supabase
 * - Adds registry entry + desktop icon to public/toybox-os
 * - Creates a local backup before modifying ToyBox OS HTML
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (prefer local .env.local)
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function ensureBackupDir() {
  const backupDir = path.join(__dirname, '../backups');
  if (!fssync.existsSync(backupDir)) fssync.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

async function deployTetris() {
  try {
    console.log('🎮 Deploying TETRIS for WebtoysOS...');

    // 1) Read Tetris HTML
    const tetrisPath = path.join(__dirname, '..', 'tetris.html');
    const tetrisHtml = await fs.readFile(tetrisPath, 'utf-8');

    // 2) Upsert app in Supabase: public/webtoysos-tetris
    console.log('📦 Publishing public/webtoysos-tetris...');
    const { data: existingApp } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', 'public')
      .eq('app_slug', 'webtoysos-tetris')
      .single();

    if (existingApp) {
      const { error } = await supabase
        .from('wtaf_content')
        .update({ html_content: tetrisHtml, updated_at: new Date().toISOString() })
        .eq('user_slug', 'public')
        .eq('app_slug', 'webtoysos-tetris');
      if (error) throw error;
      console.log('✅ Updated existing webtoysos-tetris');
    } else {
      const { error } = await supabase
        .from('wtaf_content')
        .insert({
          user_slug: 'public',
          app_slug: 'webtoysos-tetris',
          html_content: tetrisHtml,
          original_prompt: 'TETRIS - Responsive, mobile-friendly Tetris with highscores via ZAD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      console.log('✨ Created new webtoysos-tetris');
    }
    console.log('🔗 App URL: https://webtoys.ai/public/webtoysos-tetris');

    // 3) Register with ToyBox OS (public/toybox-os)
    console.log('\n🖥️ Registering in ToyBox OS...');
    const { data: toybox } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-os')
      .single();

    if (!toybox) throw new Error('Could not fetch toybox-os');
    let html = toybox.html_content;

    // Backup current ToyBox OS
    const backupDir = await ensureBackupDir();
    const backupPath = path.join(backupDir, `toybox-os_before_tetris_${Date.now()}.html`);
    await fs.writeFile(backupPath, html);
    console.log(`💾 Backup saved: ${backupPath}`);

    // Add registry entry if missing
    if (!html.includes("'webtoysos-tetris':")) {
      const entry = `\n            'webtoysos-tetris': {\n                name: 'TETRIS',\n                url: '/public/webtoysos-tetris',\n                icon: '🧱',\n                width: 480,\n                height: 640\n            },`;
      // Insert after window.windowedApps = {
      html = html.replace('window.windowedApps = {', `window.windowedApps = {${entry}`);
      console.log('✅ Added TETRIS to app registry');
    } else {
      console.log('ℹ️ TETRIS already present in registry');
    }

    // Add desktop icon if missing (absolute positioned icon under #desktop)
    if (!html.includes("openWindowedApp('webtoysos-tetris')")) {
      const desktopMatch = html.match(/<div id="desktop">\s*/);
      if (desktopMatch) {
        const insertPoint = desktopMatch.index + desktopMatch[0].length;
        const iconHTML = `\n    <!-- TETRIS Game -->\n    <div class="desktop-icon" style="left: 720px; top: 160px;" onclick="openWindowedApp('webtoysos-tetris')" title="TETRIS">\n      <div class="icon">🧱</div>\n      <div class="label">TETRIS</div>\n    </div>\n`;
        html = html.slice(0, insertPoint) + iconHTML + html.slice(insertPoint);
        console.log('✅ Added TETRIS desktop icon at (720px, 160px)');
      } else {
        console.log('⚠️ Could not find #desktop container; skipping icon injection');
      }
    } else {
      console.log('ℹ️ TETRIS desktop icon already present');
    }

    // Save updated ToyBox OS
    const { error: updErr } = await supabase
      .from('wtaf_content')
      .update({ html_content: html, updated_at: new Date().toISOString() })
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-os');
    if (updErr) throw updErr;
    console.log('✅ ToyBox OS updated');

    // Optional: seed layout data so icon has a stored position
    try {
      const { data: layoutRows } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('app_id', 'toybox-desktop-layout')
        .eq('action_type', 'desktop_state')
        .eq('participant_id', 'global')
        .order('created_at', { ascending: false })
        .limit(1);
      if (layoutRows && layoutRows[0]) {
        const latest = layoutRows[0];
        const icons = { ...(latest.content_data?.icons || {}) };
        const id = 'tetris';
        if (!icons[id]) {
          icons[id] = { x: 720, y: 160, visible: true, label: 'TETRIS' };
          await supabase.from('wtaf_zero_admin_collaborative').insert({
            app_id: 'toybox-desktop-layout',
            participant_id: 'global',
            action_type: 'desktop_state',
            content_data: { ...latest.content_data, icons, lastModified: new Date().toISOString(), modifiedBy: 'deploy-tetris' }
          });
          console.log('✅ Added TETRIS to desktop layout data');
        } else {
          console.log('ℹ️ TETRIS already present in layout data');
        }
      } else {
        console.log('ℹ️ No desktop layout snapshot found; skipping layout seeding');
      }
    } catch (e) {
      console.log('⚠️ Layout seeding skipped:', e.message);
    }

    console.log('\n🎉 SUCCESS: TETRIS deployed and registered');
    console.log('• Open OS: https://webtoys.ai/public/toybox-os');
    console.log('• Open game directly: https://webtoys.ai/public/webtoysos-tetris');

  } catch (err) {
    console.error('❌ Failed to deploy TETRIS:', err.message || err);
    process.exit(1);
  }
}

deployTetris();

