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

async function fetchApps() {
  try {
    console.log('Fetching ToyBox OS and MacWord from Supabase...');
    
    // Fetch ToyBox OS
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

    // Fetch MacWord
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

    // Save to files for analysis
    fs.writeFileSync('/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/scripts/toybox-os-current.html', toyboxData.html_content);
    fs.writeFileSync('/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/scripts/macword-current.html', macwordData.html_content);
    
    console.log('✅ Apps saved successfully:');
    console.log('  - ToyBox OS: toybox-os-current.html');
    console.log('  - MacWord: macword-current.html');
    
    // Quick analysis of postMessage patterns
    const toyboxHtml = toyboxData.html_content;
    const macwordHtml = macwordData.html_content;
    
    console.log('\n📊 Quick Analysis:');
    console.log('ToyBox OS:');
    console.log('  - Contains postMessage:', toyboxHtml.includes('postMessage'));
    console.log('  - Contains auth state send:', toyboxHtml.includes('currentUser') && toyboxHtml.includes('postMessage'));
    console.log('  - Contains iframe creation:', toyboxHtml.includes('iframe'));
    
    console.log('\nMacWord:');
    console.log('  - Contains message listener:', macwordHtml.includes('addEventListener') && macwordHtml.includes('message'));
    console.log('  - Contains currentUser variable:', macwordHtml.includes('currentUser'));
    console.log('  - Contains auth status display:', macwordHtml.includes('Not logged in'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchApps();