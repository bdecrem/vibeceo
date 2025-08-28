import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fetchIssuesApp() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase environment variables');
      console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
      console.log('SUPABASE_SERVICE_KEY present:', !!process.env.SUPABASE_SERVICE_KEY);
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('wtaf_content')
      .select('*')
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-issue-tracker')
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return;
    }
    
    if (!data) {
      console.log('Issues app not found');
      return;
    }
    
    console.log('✅ Found Issues app:');
    console.log('Title:', data.title);
    console.log('Created:', data.created_at);
    console.log('Updated:', data.updated_at);
    
    if (data.content) {
      console.log('Content length:', data.content.length, 'characters');
      // Write content to temporary file for analysis
      fs.writeFileSync('/tmp/current-issues-app.html', data.content);
      console.log('✅ Content written to /tmp/current-issues-app.html');
    } else {
      console.log('⚠️  No content found in app');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fetchIssuesApp();