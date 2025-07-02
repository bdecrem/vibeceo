import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixApp() {
  console.log('🔧 Manually updating turquoise-rabbit-exploring to type ZAD...');
  
  const { error } = await supabase
    .from('wtaf_content')
    .update({ type: 'ZAD' })
    .eq('user_slug', 'bart')
    .eq('app_slug', 'turquoise-rabbit-exploring');
  
  if (error) {
    console.error('❌ Failed:', error.message);
  } else {
    console.log('✅ Successfully updated turquoise-rabbit-exploring to type ZAD');
    
    // Verify the change
    const { data, error: checkError } = await supabase
      .from('wtaf_content')
      .select('type')
      .eq('user_slug', 'bart')
      .eq('app_slug', 'turquoise-rabbit-exploring')
      .single();
    
    if (checkError) {
      console.error('❌ Failed to verify:', checkError.message);
    } else {
      console.log(`🔍 Verified: type is now "${data.type}"`);
    }
  }
}

fixApp().catch(console.error); 