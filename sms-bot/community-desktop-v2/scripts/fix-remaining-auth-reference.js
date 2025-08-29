import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRemainingAuthReference() {
  try {
    console.log('🔧 Fixing remaining currentToyBoxUser reference...');
    
    // Fetch current ToyBox OS
    const { data: toyboxData, error: toyboxError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-os')
      .single();

    if (toyboxError) {
      console.error('Error fetching ToyBox OS:', toyboxError);
      return;
    }

    let toyboxHtml = toyboxData.html_content;

    // Fix the remaining reference in broadcastAuth function
    const oldBroadcast = `                        user: currentToyBoxUser`;
    const newBroadcast = `                        user: currentUser`;

    toyboxHtml = toyboxHtml.replace(oldBroadcast, newBroadcast);

    // Update ToyBox OS in Supabase
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        html_content: toyboxHtml,
        updated_at: new Date().toISOString()
      })
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-os');

    if (updateError) {
      console.error('Error updating ToyBox OS:', updateError);
      return;
    }

    console.log('✅ Fixed remaining auth reference!');
    console.log('✅ All auth communication now uses currentUser consistently');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixRemainingAuthReference();