const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

// SECURITY: Use environment variables for sensitive keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_KEY not found in environment variables');
  console.error('Please add SUPABASE_SERVICE_KEY to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlugGeneration() {
  // Check if there's a function for slug generation
  const { data: functions, error } = await supabase
    .rpc('pg_catalog.pg_proc', {})
    .select('proname')
    .like('proname', '%slug%');
    
  console.log('Functions with "slug" in name:', functions);
  
  // Let's see how slugs look in the database
  const { data: slugs } = await supabase
    .from('sms_subscribers')
    .select('slug')
    .not('slug', 'like', '%pending%')
    .not('slug', 'like', 'bart%')
    .not('slug', 'like', 'test%')
    .limit(20);
    
  console.log('\nSample slugs from database:');
  slugs?.forEach(s => console.log(`  ${s.slug}`));
  
  // Check for patterns
  const patterns = slugs?.map(s => {
    const parts = s.slug.split(/[-_]/);
    return parts.length;
  });
  
  console.log('\nSlug patterns (word count):', new Set(patterns));
}

checkSlugGeneration().catch(console.error);