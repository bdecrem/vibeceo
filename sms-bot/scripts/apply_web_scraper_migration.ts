/**
 * Apply migration: Add web_scraper source type
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying web_scraper migration...');

  try {
    // Drop existing constraint
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_sources
        DROP CONSTRAINT IF EXISTS user_sources_kind_check;
      `,
    });

    if (dropError) {
      console.log('Note: Could not drop constraint (may not exist):', dropError.message);
    }

    // Add new constraint with web_scraper
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_sources
        ADD CONSTRAINT user_sources_kind_check
        CHECK (kind IN ('rss', 'http_json', 'web_scraper'));
      `,
    });

    if (addError) throw addError;

    console.log('✅ Migration applied successfully!');
    console.log('   user_sources.kind now accepts: rss, http_json, web_scraper');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
