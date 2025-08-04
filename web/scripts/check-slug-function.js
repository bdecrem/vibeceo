const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbmlzZW9jY3p0dHJmd3RwYmRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg4MjkyMiwiZXhwIjoyMDY0NDU4OTIyfQ.L_NM27cVyq2uGNjtfzffRylBd5zEVOSxupqbYGVQwlc';

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