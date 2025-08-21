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

async function fixMacWordAuthRequest() {
  try {
    console.log('🔧 Adding auth request to MacWord initialization...');
    
    // Fetch current MacWord
    const { data: macwordData, error: macwordError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', 'public')
      .eq('app_slug', 'macword')
      .single();

    if (macwordError) {
      console.error('Error fetching MacWord:', macwordError);
      return;
    }

    // Create backup
    fs.writeFileSync(`/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/macword_auth_request_fix_${Date.now()}.html`, macwordData.html_content);
    console.log('✅ MacWord backup created');

    let macwordHtml = macwordData.html_content;

    // Add requestAuthState() call to initialization
    const oldInit = `            updateCounts();
            updateDocName();`;

    const newInit = `            updateCounts();
            updateDocName();
            
            // Request auth state from ToyBox OS
            setTimeout(() => requestAuthState(), 500);`;

    macwordHtml = macwordHtml.replace(oldInit, newInit);

    // Update MacWord in Supabase
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        html_content: macwordHtml,
        updated_at: new Date().toISOString()
      })
      .eq('user_slug', 'public')
      .eq('app_slug', 'macword');

    if (updateError) {
      console.error('Error updating MacWord:', updateError);
      return;
    }

    console.log('✅ MacWord updated to request auth on load!');
    console.log('');
    console.log('🔧 Change made:');
    console.log('  - MacWord now calls requestAuthState() on load');
    console.log('  - This will trigger ToyBox OS to send current auth state');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixMacWordAuthRequest();