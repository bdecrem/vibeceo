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

async function fixOverrideFlag(userSlug: string, appSlug: string) {
  console.log(`\n🔧 Fixing override flag for: ${userSlug}/${appSlug}`);
  
  // First check current state
  const { data: current, error: checkError } = await supabase
    .from('wtaf_content')
    .select('og_image_url, og_image_override')
    .eq('user_slug', userSlug)
    .eq('app_slug', appSlug)
    .single();
    
  if (checkError) {
    console.error('❌ Error checking app:', checkError.message);
    return;
  }
  
  console.log('Current state:');
  console.log('  OG URL:', current.og_image_url || 'NULL');
  console.log('  Override:', current.og_image_override);
  
  if (!current.og_image_url) {
    console.log('⚠️  No custom OG image URL found, nothing to fix');
    return;
  }
  
  if (current.og_image_override === true) {
    console.log('✅ Override flag already set to true');
    return;
  }
  
  // Update the override flag
  const { error: updateError } = await supabase
    .from('wtaf_content')
    .update({ og_image_override: true })
    .eq('user_slug', userSlug)
    .eq('app_slug', appSlug);
    
  if (updateError) {
    console.error('❌ Error updating:', updateError.message);
    return;
  }
  
  console.log('✅ Successfully set og_image_override = true');
  console.log('🌟 Custom OG image will now stick!');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 1) {
  // Just app slug provided, look it up
  const appSlug = args[0];
  
  supabase
    .from('wtaf_content')
    .select('user_slug')
    .eq('app_slug', appSlug)
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        console.error('❌ Could not find app:', appSlug);
        process.exit(1);
      }
      fixOverrideFlag(data.user_slug, appSlug);
    });
    
} else if (args.length === 2) {
  // User and app slug provided
  const [userSlug, appSlug] = args;
  fixOverrideFlag(userSlug, appSlug);
  
} else {
  console.log('Usage:');
  console.log('  npm run fix:og-override <app-slug>');
  console.log('  npm run fix:og-override <user-slug> <app-slug>');
  console.log('');
  console.log('Example:');
  console.log('  npm run fix:og-override azure-phoenix-jumping');
  console.log('  npm run fix:og-override bart azure-phoenix-jumping');
}