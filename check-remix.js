require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkLatestRemix() {
  console.log('🔍 Checking latest remix entries...\n');
  
  try {
    const { data, error } = await supabase
      .from('wtaf_remix_lineage')
      .select(`
        *,
        child_content:wtaf_content!wtaf_remix_lineage_child_app_id_fkey(app_slug, user_slug),
        parent_content:wtaf_content!wtaf_remix_lineage_parent_app_id_fkey(app_slug, user_slug)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Found ${data.length} recent remix entries:\n`);
    
    data.forEach((entry, i) => {
      console.log(`${i + 1}. 🧬 Generation ${entry.generation_level}`);
      console.log(`   📅 ${entry.created_at}`);
      console.log(`   👤 ${entry.parent_user_slug}/${entry.parent_content?.app_slug || 'unknown'}`);
      console.log(`   ↓ "${entry.remix_prompt}"`);
      console.log(`   👤 ${entry.child_user_slug}/${entry.child_content?.app_slug || 'unknown'}`);
      console.log('');
    });

  } catch (err) {
    console.error('💥 Script error:', err);
  }
}

checkLatestRemix(); 