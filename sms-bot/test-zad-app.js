import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function saveZadApp() {
  const { data, error } = await supabase
    .from('wtaf_content')
    .select('html_content')
    .eq('app_slug', 'turquoise-spotted-competing')
    .eq('user_slug', 'bart')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Save to file
  writeFileSync('turquoise-spotted-competing.html', data.html_content);
  console.log('✅ Saved ZAD app HTML to turquoise-spotted-competing.html');
  console.log(`📏 File size: ${data.html_content.length} chars`);
}

saveZadApp();