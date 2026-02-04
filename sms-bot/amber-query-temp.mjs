import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Query 1: Loop state
  const { data: loopData, error: loopError } = await supabase
    .from('amber_state')
    .select('content, metadata, created_at')
    .eq('type', 'loop_state')
    .order('created_at', { ascending: false })
    .limit(1);
  
  console.log('=== THINKHARD LOOP STATE ===');
  if (loopError) console.error('Error:', loopError);
  else console.log(JSON.stringify(loopData, null, 2));
  
  // Query 2: Amber state (persona, memory, log_entry)
  const { data: stateData, error: stateError } = await supabase
    .from('amber_state')
    .select('type, content, created_at')
    .in('type', ['persona', 'memory', 'log_entry'])
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n=== AMBER STATE (persona, memory, log_entry) ===');
  if (stateError) console.error('Error:', stateError);
  else console.log(JSON.stringify(stateData, null, 2));
  
  // Query 3: Voice sessions
  const { data: voiceData, error: voiceError } = await supabase
    .from('amber_state')
    .select('content, metadata, created_at')
    .eq('type', 'voice_session')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('\n=== RECENT VOICE SESSIONS ===');
  if (voiceError) console.error('Error:', voiceError);
  else console.log(JSON.stringify(voiceData, null, 2));
}

main().catch(console.error);
