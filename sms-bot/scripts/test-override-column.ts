import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY!
);

async function testOverrideColumn() {
  console.log('Testing og_image_override column...\n');
  
  // Try to update a test record
  const testSlug = 'test-override-' + Date.now();
  
  // First insert a test record
  console.log('1. Inserting test record...');
  const { error: insertError } = await supabase
    .from('wtaf_content')
    .insert({
      user_slug: 'test',
      app_slug: testSlug,
      html_content: '<html>test</html>',
      status: 'published',
      og_image_override: true
    });
    
  if (insertError) {
    console.log('Insert error (might be expected):', insertError.message);
    
    // Try updating an existing record instead
    console.log('\n2. Trying to update bart/azure-phoenix-jumping...');
    
    const { data: updateData, error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        og_image_override: true
      })
      .eq('user_slug', 'bart')
      .eq('app_slug', 'azure-phoenix-jumping')
      .select();
      
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      console.error('Full error:', updateError);
    } else {
      console.log('✅ Update succeeded!');
      console.log('Returned data:', updateData);
    }
    
    // Now check if it actually updated
    console.log('\n3. Verifying the update...');
    const { data: checkData, error: checkError } = await supabase
      .from('wtaf_content')
      .select('og_image_override')
      .eq('user_slug', 'bart')
      .eq('app_slug', 'azure-phoenix-jumping')
      .single();
      
    if (checkError) {
      console.error('Check error:', checkError.message);
    } else {
      console.log('Current og_image_override value:', checkData.og_image_override);
      console.log('Type of value:', typeof checkData.og_image_override);
    }
  } else {
    console.log('Test record inserted successfully');
    
    // Clean up
    await supabase
      .from('wtaf_content')
      .delete()
      .eq('app_slug', testSlug);
  }
}

testOverrideColumn();