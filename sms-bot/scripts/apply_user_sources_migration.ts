/**
 * Apply User Sources Migration (009_user_sources.sql)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📚 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'migrations', '009_user_sources.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying user_sources migration...');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Trying direct query execution...');
      const { error: directError } = await supabase.from('_').select().limit(0);

      // Use pg library for direct SQL execution
      console.log('Note: You may need to apply this migration manually via Supabase SQL Editor');
      console.log('Migration file location:', migrationPath);
      console.log('\nMigration SQL:\n');
      console.log(sql);

      throw error;
    }

    console.log('✅ Migration applied successfully!');

    // Verify tables exist
    const { data: sources, error: sourcesError } = await supabase
      .from('user_sources')
      .select('count')
      .limit(0);

    const { data: logs, error: logsError } = await supabase
      .from('source_fetch_logs')
      .select('count')
      .limit(0);

    if (!sourcesError && !logsError) {
      console.log('✅ Tables verified: user_sources and source_fetch_logs exist');
    } else {
      console.warn('⚠️  Table verification had issues (this might be OK if RLS is enabled)');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 To apply manually:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of migrations/009_user_sources.sql');
    console.log('4. Execute the SQL');
    process.exit(1);
  }
}

applyMigration();
