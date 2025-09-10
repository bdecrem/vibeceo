#!/usr/bin/env node

/**
 * Builder Bot Webhook Server (first-come lock, no fallback)
 * - Exposes POST /builderbot/webhook
 * - Manages a single lock via ZAD (wtaf_zero_admin_collaborative)
 * - Accepts chat messages from the lock holder and persists them to ZAD
 * - Hooks to the Edit Agent pipeline to build/update apps and auto-deploy
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';

const exec = promisify(_exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EDIT_AGENT_ENABLED = (process.env.EDIT_AGENT_ENABLED || 'true').toLowerCase() === 'true';
const PORT = parseInt(process.env.BUILDER_BOT_PORT || '3041', 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const APP_ID = 'toybox-builder-bot';

// Helpers for ZAD rows
async function zadInsert(action_type, content_data, participant_id = 'system') {
  const { error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .insert({ app_id: APP_ID, action_type, content_data, participant_id, created_at: new Date() });
  if (error) throw error;
}

async function getLatestLock() {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('content_data, created_at')
    .eq('app_id', APP_ID)
    .eq('action_type', 'lock')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.content_data || null;
}

function nowIso() { return new Date().toISOString(); }
function addMinutes(date, mins) { return new Date(new Date(date).getTime() + mins*60000).toISOString(); }

// Very simple lock policy: first-come wins; 10-minute TTL; only holder can release
async function handleLockRequest(req, res) {
  const user = req.body?.user || {};
  const participantId = user.participantId;
  if (!participantId) return res.status(400).json({ success: false, error: 'missing participantId' });
  const current = await getLatestLock();
  const now = nowIso();
  const expired = current && current.expires_at && new Date(current.expires_at) < new Date(now);
  const available = !current || !current.locked_by || expired;
  if (!available) {
    return res.json({ success: false, message: 'busy', locked_by: current.locked_by, expires_at: current.expires_at });
  }
  const lock = { locked_by: participantId, locked_at: now, expires_at: addMinutes(now, 10) };
  await zadInsert('lock', lock, participantId);
  return res.json({ success: true, lock });
}

async function handleLockRelease(req, res) {
  const user = req.body?.user || {};
  const participantId = user.participantId;
  const current = await getLatestLock();
  if (!current || current.locked_by !== participantId) {
    return res.json({ success: false, message: 'not holder' });
  }
  const release = { locked_by: null, released_by: participantId, released_at: nowIso() };
  await zadInsert('lock', release, participantId);
  return res.json({ success: true });
}

async function handleChatMessage(req, res) {
  const user = req.body?.user || {};
  const text = (req.body?.text || '').toString();
  const participantId = user.participantId;
  if (!participantId || !text) return res.status(400).json({ success: false, error: 'missing fields' });

  // Only current holder can send messages
  const current = await getLatestLock();
  if (!current || current.locked_by !== participantId) {
    return res.json({ success: false, message: 'not holder' });
  }

  // Persist user message
  await zadInsert('chat_message', { author: (user.handle||'USER'), text, timestamp: Date.now() }, participantId);

  // Kick off agent (non-blocking best-effort)
  if (EDIT_AGENT_ENABLED) {
    try {
      // Minimal prompt – build from the latest messages is a next step
      const cwd = path.join(__dirname, '../../webtoys-os');
      // For now, call the v2 executor with a tiny prompt seed; replace with richer context later
      const cmd = `node agents/edit-agent/execute-open-issue-v2.js`;
      await exec(cmd, { cwd, maxBuffer: 10*1024*1024, timeout: 60000 }).catch(()=>{});
    } catch {}
  }

  // Stub bot response for now
  await zadInsert('chat_message', { author: 'BUILDER_BOT', text: 'Got it. Working on it…', timestamp: Date.now() }, 'system');

  return res.json({ success: true });
}

function createServer() {
  const app = express();
  app.use(express.json());
  app.get('/health', (req,res)=> res.json({ status: 'ok', editAgent: EDIT_AGENT_ENABLED, ts: nowIso() }));
  app.post('/builderbot/webhook', async (req, res) => {
    try {
      const { type } = req.body || {};
      if (type === 'lock_request') return await handleLockRequest(req, res);
      if (type === 'lock_release') return await handleLockRelease(req, res);
      if (type === 'chat_message') return await handleChatMessage(req, res);
      return res.status(400).json({ success: false, error: 'unsupported type' });
    } catch (e) {
      console.error('Webhook error:', e);
      return res.status(500).json({ success: false, error: 'server error' });
    }
  });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`🤖 Builder Bot server listening on ${PORT}`);
  });
}

export { createServer };

