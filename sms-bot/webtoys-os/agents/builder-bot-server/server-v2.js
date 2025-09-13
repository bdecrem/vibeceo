#!/usr/bin/env node
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EDIT_AGENT_ENABLED = (process.env.EDIT_AGENT_ENABLED || 'true').toLowerCase() === 'true';
const PORT = parseInt(process.env.BUILDER_BOT_PORT || '3042', 10);
const APP_ID = 'toybox-builder-bot';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
async function getRecentMessages(limit=50){
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('content_data, created_at, participant_id')
    .eq('app_id', APP_ID)
    .eq('action_type', 'chat_message')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data||[]).map(r=>({ ...r.content_data, created_at: r.created_at, participant_id: r.participant_id }));
}
function nowIso(){ return new Date().toISOString(); }
function addMinutes(d, m){ return new Date(new Date(d).getTime()+m*60000).toISOString(); }

async function handleLockRequest(req, res){
  const participantId = req.body?.user?.participantId;
  if (!participantId) return res.status(400).json({ success:false, error:'missing participantId' });
  const current = await getLatestLock();
  const now = nowIso();
  const expired = current && current.expires_at && new Date(current.expires_at) < new Date(now);
  const available = !current || !current.locked_by || expired;
  const sameHandle = current && current.locked_by && (current.locked_by.split('_')[0] === participantId.split('_')[0]);
  if (!available && !sameHandle) return res.json({ success:false, message:'busy', locked_by: current.locked_by, expires_at: current.expires_at });
  const holder = sameHandle && current.locked_by ? current.locked_by : participantId;
  const session_id = (available || !current?.session_id) ? uuidv4() : current.session_id;
  const lock = { locked_by: holder, locked_at: now, expires_at: addMinutes(now,10), session_id };
  await zadInsert('lock', lock, holder);
  return res.json({ success:true, lock });
}
async function handleLockRelease(req, res){
  const participantId = req.body?.user?.participantId;
  const current = await getLatestLock();
  const sameHandle = current && current.locked_by && participantId && (current.locked_by.split('_')[0] === participantId.split('_')[0]);
  if (!current || (current.locked_by !== participantId && !sameHandle)) return res.json({ success:false, message:'not holder' });
  // mark session end for observers
  await zadInsert('session_event', { type:'session_closed', session_id: current.session_id, closed_by: participantId, closed_at: nowIso() }, participantId);
  await zadInsert('lock', { locked_by:null, released_by: participantId, released_at: nowIso(), session_id: current.session_id }, participantId);
  return res.json({ success:true });
}
async function handleChatMessage(req, res){
  const user = req.body?.user || {}; const participantId = user.participantId; const text = (req.body?.text||'').toString();
  if (!participantId || !text) return res.status(400).json({ success:false, error:'missing fields' });
  const current = await getLatestLock();
  const sameHandle = current && current.locked_by && (current.locked_by.split('_')[0] === participantId.split('_')[0]);
  if (!current || (current.locked_by !== participantId && !sameHandle)) return res.json({ success:false, message:'not holder' });
  await zadInsert('chat_message', { author: (user.handle||'USER'), text, timestamp: Date.now(), session_id: current.session_id }, participantId);
  // extend TTL
  const now = nowIso();
  await zadInsert('lock', { locked_by: current.locked_by, locked_at: current.locked_at || now, expires_at: addMinutes(now,10), session_id: current.session_id }, current.locked_by);
  // placeholder agent response
  await zadInsert('chat_message', { author:'BUILDER_BOT', text:'Working on it…', timestamp: Date.now(), session_id: current.session_id }, 'system');
  return res.json({ success:true });
}

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
app.get('/health', (req,res)=> res.json({ status:'ok', editAgent: EDIT_AGENT_ENABLED, port: PORT, ts: nowIso() }));
app.get('/builderbot/state', async (req,res) => {
  try{
    const lock = await getLatestLock();
    const messages = await getRecentMessages(100);
    return res.json({ lock, messages });
  }catch(e){ console.error('state error', e); return res.status(500).json({ error:'state error' }); }
});
app.post('/builderbot/webhook', async (req, res) => {
  try{
    const { type } = req.body || {};
    if (type === 'lock_request') return await handleLockRequest(req,res);
    if (type === 'lock_release') return await handleLockRelease(req,res);
    if (type === 'chat_message') return await handleChatMessage(req,res);
    return res.status(400).json({ success:false, error:'unsupported type' });
  }catch(e){ console.error(e); return res.status(500).json({ success:false, error:'server error' }); }
});

app.listen(PORT, ()=> console.log(`🤖 Builder Bot v2 on ${PORT}`));
