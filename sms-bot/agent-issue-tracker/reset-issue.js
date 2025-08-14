import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Reset issue 1915 to new status for testing
supabase.from('wtaf_zero_admin_collaborative')
  .select('*')
  .eq('id', 1915)
  .single()
  .then(({data}) => {
    const updatedContent = {
      ...data.content_data,
      status: 'new',
      idea: data.content_data.idea || 'Fix typo in README.md - change Success to Huge success on line 42'
    };
    
    return supabase.from('wtaf_zero_admin_collaborative')
      .update({ content_data: updatedContent })
      .eq('id', 1915);
  })
  .then(() => {
    console.log('✅ Reset issue 1915 to new status');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });