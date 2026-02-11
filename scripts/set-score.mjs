import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from web/.env.local
config({ path: resolve(process.cwd(), 'web/.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setScore(handle, gameId, score, force = false) {
  // Find user
  const { data: user, error: userError } = await supabase
    .from('pixelpit_users')
    .select('id, handle')
    .eq('handle', handle)
    .single();

  if (userError || !user) {
    console.error('User not found:', handle, userError);
    return;
  }

  console.log('Found user:', user);

  // Delete all existing entries for this user/game if forcing
  if (force) {
    const { error: deleteError } = await supabase
      .from('pixelpit_entries')
      .delete()
      .eq('game_id', gameId)
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('Error deleting existing entries:', deleteError);
    } else {
      console.log('Deleted existing entries for', handle, 'on', gameId);
    }
  }

  // Insert new entry
  const { data: entry, error: entryError } = await supabase
    .from('pixelpit_entries')
    .insert({
      game_id: gameId,
      user_id: user.id,
      score: score,
    })
    .select()
    .single();

  if (entryError) {
    console.error('Error inserting entry:', entryError);
    return;
  }

  console.log('Score set successfully:', entry);
}

// Run
const [handle, gameId, score, forceFlag] = process.argv.slice(2);
if (!handle || !gameId || !score) {
  console.log('Usage: node set-score.mjs <handle> <game_id> <score> [--force]');
  process.exit(1);
}

setScore(handle, gameId, parseInt(score, 10), forceFlag === '--force');
