import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY!
);

async function check() {
  const appSlug = process.argv[2] || 'azure-phoenix-jumping';
  
  console.log(`Checking for app_slug: ${appSlug}\n`);
  
  const { data, error } = await supabase
    .from('wtaf_content')
    .select('user_slug, app_slug, type, og_image_override, og_image_url, og_second_chance')
    .eq('app_slug', appSlug);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No apps found with that slug');
    return;
  }
  
  console.log(`Found ${data.length} app(s):\n`);
  data.forEach((app, i) => {
    console.log(`App ${i + 1}:`);
    console.log(`  User: ${app.user_slug}`);
    console.log(`  Slug: ${app.app_slug}`);
    console.log(`  Type: ${app.type}`);
    console.log(`  Override: ${app.og_image_override}`);
    console.log(`  OG URL: ${app.og_image_url || 'NULL'}`);
    console.log(`  Second Chance: ${app.og_second_chance || 'NULL'}`);
    console.log('');
  });
}

check();