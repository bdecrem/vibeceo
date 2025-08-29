import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fetchApp() {
  try {
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('*')
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-issue-tracker')
      .single();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('App found:', data.title);
    console.log('Created:', data.created_at);
    console.log('Updated:', data.updated_at);
    
    // Save to file for analysis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `current-toybox-issue-tracker-${timestamp}.html`;
    fs.writeFileSync(filename, data.html_content);
    console.log(`HTML saved to: ${filename}`);
    
    // Also show some key patterns
    const hasLoadRecentUpdates = data.html_content.includes('loadRecentUpdates');
    const hasDisplayIssues = data.html_content.includes('displayIssues');
    const hasZADLoad = data.html_content.includes('load(');
    
    console.log('Functions found:');
    console.log('- loadRecentUpdates:', hasLoadRecentUpdates);
    console.log('- displayIssues:', hasDisplayIssues);
    console.log('- ZAD load calls:', hasZADLoad);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

fetchApp();