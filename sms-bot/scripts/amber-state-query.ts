import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local (try both locations)
const envPath1 = path.resolve(__dirname, '../.env.local');
const envPath2 = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath1 });
dotenv.config({ path: envPath2 });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('=== AMBER STATE QUERY ===\n');

  // Query 1: Get all amber state by type
  const { data: stateData, error: stateError } = await supabase
    .from('amber_state')
    .select('type, content, created_at')
    .in('type', ['persona', 'memory', 'log_entry', 'loop_state', 'voice_session'])
    .order('type')
    .order('created_at', { ascending: false })
    .limit(30);

  if (stateError) {
    console.error('Error fetching state:', stateError);
  } else {
    console.log('Amber State Records (30 most recent):\n');
    console.log(JSON.stringify(stateData, null, 2));
  }

  console.log('\n\n=== ACTIVE THINKHARD LOOP ===\n');

  // Query 2: Check for active thinkhard loop
  const { data: loopData, error: loopError } = await supabase
    .from('amber_state')
    .select('content, metadata, created_at')
    .eq('type', 'loop_state')
    .order('created_at', { ascending: false })
    .limit(1);

  if (loopError) {
    console.error('Error fetching loop state:', loopError);
  } else if (loopData && loopData.length > 0) {
    console.log('Active thinkhard loop found:\n');
    console.log(JSON.stringify(loopData[0], null, 2));
  } else {
    console.log('No active thinkhard loop found.');
  }
}

main().catch(console.error);
