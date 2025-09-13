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
import { exec as _exec, spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';

const exec = promisify(_exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from sms-bot/.env.local
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

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

async function getRecentMessages(limit = 100) {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('content_data, created_at, participant_id')
    .eq('app_id', APP_ID)
    .eq('action_type', 'chat_message')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(r => ({ ...r.content_data, created_at: r.created_at, participant_id: r.participant_id }));
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
  if (!available && current && current.locked_by) {
    return res.json({ success: false, message: 'busy', locked_by: current.locked_by, expires_at: current.expires_at });
  }
  const session_id = (available || !current?.session_id) ? uuidv4() : current.session_id;
  const lock = { locked_by: participantId, locked_at: now, expires_at: addMinutes(now, 10), session_id };
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
  const release = { locked_by: null, released_by: participantId, released_at: nowIso(), session_id: current.session_id };
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
  await zadInsert('chat_message', { author: (user.handle||'USER'), text, timestamp: Date.now(), session_id: current.session_id }, participantId);

  // Process request with edit agent (async; respond immediately)
  let botResponse = 'Got it. Working on it…';
  let appUrl = null;
  
  if (EDIT_AGENT_ENABLED) {
    try {
      console.log(`🤖 Processing Builder Bot request: "${text}"`);
      
      // Create temporary issue in Issue Tracker format for the edit agent
      const issueContent = {
        title: text.length > 50 ? text.substring(0, 50) + '...' : text,
        description: text,
        author: user.handle || 'BUILDER_BOT',
        status: 'new',
        created: new Date().toISOString(),
        comments: [],
        source: 'builder-bot'
      };
      
      // Save synthetic issue temporarily using ZAD format
      const { data: issueData, error: issueError } = await supabase
        .from('webtoys_issue_tracker_data')
        .insert({
          app_id: 'toybox-issue-tracker-v3',
          participant_id: user.handle || 'BUILDER_BOT',
          action_type: 'issue',
          content_data: issueContent,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (!issueError && issueData) {
        console.log(`📝 Created synthetic issue #${issueData.id} for Builder Bot request`);
        // Notify chat immediately that we queued the issue
        await zadInsert('chat_message', { author:'BUILDER_BOT', text:`📝 Queued your request as issue #${issueData.id}. I will report back here when it finishes.`, timestamp: Date.now(), session_id: current.session_id }, 'system');

        // Execute edit agent asynchronously
        const cwd = path.join(__dirname, '../edit-agent');
        const env = {
          ...process.env,
          ISSUE_TRACKER_APP_ID: 'toybox-issue-tracker-v3',
          BUILDER_BOT_MODE: 'true',
          BUILDER_BOT_FORCE: 'true',
          BUILDER_BOT_ISSUE_ID: String(issueData.id)
        };
        const child = spawn('node', ['execute-open-issue-v2.js'], { cwd, env });
        let out=''; let err='';
        child.stdout.on('data', d=> out += d.toString());
        child.stderr.on('data', d=> err += d.toString());
        child.on('close', async (code)=>{
          try{
            console.log(`✅ Edit agent finished for issue #${issueData.id} (code ${code})`);
            const urlMatch = out.match(/https:\/\/webtoys\.ai\/public\/[a-zA-Z0-9-]+/);
            let final = '';
            if (urlMatch) {
              final = `✅ I built your app! Check it out: ${urlMatch[0]}`;
            } else {
              final = '✅ I worked on your request. Check the Issue Tracker for details.';
            }
            await zadInsert('chat_message', { author:'BUILDER_BOT', text: final, timestamp: Date.now(), session_id: current.session_id }, 'system');
          }catch(e){ console.error('post-agent message failed', e); }
        });
        // Respond quickly to the client; background process continues
        await zadInsert('chat_message', { author:'BUILDER_BOT', text: 'Working on it…', timestamp: Date.now(), session_id: current.session_id }, 'system');
        return res.json({ success:true, queuedIssue: issueData.id });
        
      } else {
        console.error('❌ Failed to create synthetic issue:', issueError);
        botResponse = '❌ Sorry, I had trouble processing your request. Please try again.';
      }
      
    } catch (error) {
      console.error('❌ Edit agent execution failed:', error);
      botResponse = '❌ I encountered an error while building your app. Please try a simpler request.';
    }
  }

  // Fallback response (should rarely hit due to early return above)
  await zadInsert('chat_message', { author: 'BUILDER_BOT', text: botResponse, timestamp: Date.now(), app_url: appUrl, session_id: current.session_id }, 'system');
  return res.json({ success: true, note: 'sync path' });
}

function createServer() {
  const app = express();
  
  // Add CORS middleware to allow requests from WebtoysOS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  app.use(express.json());
  app.get('/health', (req,res)=> res.json({ status: 'ok', editAgent: EDIT_AGENT_ENABLED, ts: nowIso() }));
  app.get('/builderbot/state', async (req,res) => {
    try {
      const lock = await getLatestLock();
      const messages = await getRecentMessages(100);
      return res.json({ lock, messages });
    } catch (e) {
      console.error('state error:', e);
      return res.status(500).json({ error: 'state error' });
    }
  });
  app.post('/builderbot/webhook', async (req, res) => {
    try {
      const { type } = req.body || {};
      if (type === 'lock_request') return await handleLockRequest(req, res);
      if (type === 'lock_release') return await handleLockRelease(req, res);
      if (type === 'chat_message') return await handleChatMessage(req, res);
      if (type === 'flush') {
        // Flush: clear lock and close any pending Builder Bot issues so next request runs immediately
        try {
          const now = nowIso();
          await zadInsert('lock', { locked_by: null, released_by: 'admin', released_at: now }, 'system');

          // Find pending builder-bot issues
          const { data: pending, error: qerr } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('id, content_data')
            .eq('app_id', 'toybox-issue-tracker-v3')
            .eq('content_data->>source', 'builder-bot')
            .in('content_data->>status', ['new','open','processing'])
            .limit(100);
          if (qerr) throw qerr;

          // Close them
          if (pending && pending.length) {
            for (const row of pending) {
              const cd = row.content_data || {};
              const updated = {
                ...cd,
                status: 'completed',
                admin_comments: [
                  ...(cd.admin_comments || []),
                  {
                    text: `Flushed for test at ${now}`,
                    author: 'Builder Bot',
                    authorRole: 'SYSTEM',
                    timestamp: now
                  }
                ]
              };
              await supabase
                .from('webtoys_issue_tracker_data')
                .update({ content_data: updated })
                .eq('id', row.id);
            }
          }

          await zadInsert('chat_message', { author:'BUILDER_BOT', text:'Queue flushed. Ready for next request.', timestamp: Date.now() }, 'system');
          return res.json({ success: true, flushed: (pending||[]).length });
        } catch (e) {
          console.error('Flush error:', e);
          return res.status(500).json({ success: false, error: 'flush failed' });
        }
      }
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
