import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Get current directory equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '../../.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHabitTracker() {
    console.log('🔍 Checking for habit tracker records...');
    
    // Check all records containing "habit"
    const { data: habitRecords, error: habitError } = await supabase
        .from('wtaf_content')
        .select('id, user_slug, app_slug, created_at, original_prompt')
        .ilike('app_slug', '%habit%');
    
    if (habitError) {
        console.error('❌ Error checking habit records:', habitError);
        return;
    }
    
    console.log('📄 Found habit-related records:');
    habitRecords?.forEach(record => {
        console.log(`  - ${record.user_slug}/${record.app_slug} (${record.id})`);
        console.log(`    Created: ${record.created_at}`);
        console.log(`    Prompt: ${record.original_prompt?.substring(0, 100)}...`);
        console.log();
    });
    
    // Check all records for user 'bart'
    const { data: bartRecords, error: bartError } = await supabase
        .from('wtaf_content')
        .select('id, user_slug, app_slug, created_at')
        .eq('user_slug', 'bart')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (bartError) {
        console.error('❌ Error checking bart records:', bartError);
        return;
    }
    
    console.log('📄 Recent records for user "bart":');
    bartRecords?.forEach(record => {
        console.log(`  - ${record.user_slug}/${record.app_slug} (${record.created_at})`);
    });
}

checkHabitTracker(); 