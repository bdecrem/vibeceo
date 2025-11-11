/**
 * Run migration 002: AIR Personalized Schema
 *
 * This script runs the SQL migration against the production Supabase database.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log(`   URL: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '../migrations/002_air_personalized_schema.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`   Path: ${migrationPath}`);
    console.log(`   Size: ${sql.length} bytes`);
    console.log('');

    // Split SQL into individual statements (Supabase RPC can handle one at a time)
    // Remove comments and split by semicolon
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`🚀 Running ${statements.length} SQL statements...`);
    console.log('');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');

      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt });

        if (error) {
          // Some errors are expected (like "column already exists")
          if (error.message.includes('already exists') ||
              error.message.includes('does not exist')) {
            console.log(`   ⚠️  ${error.message} (skipping)`);
          } else {
            console.error(`   ❌ Error: ${error.message}`);
            throw error;
          }
        } else {
          console.log('   ✅ Success');
        }
      } catch (err) {
        console.error(`   ❌ Failed to execute statement:`, err);
        console.error('   Statement:', stmt);
        throw err;
      }
    }

    console.log('');
    console.log('✅ Migration 002 completed successfully!');
    console.log('');
    console.log('🔍 Verifying schema changes...');

    // Verify the changes
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'agent_subscriptions')
      .eq('column_name', 'preferences');

    if (colError) {
      console.log('   ⚠️  Could not verify preferences column (may not have permissions)');
    } else if (columns && columns.length > 0) {
      console.log('   ✅ preferences column added to agent_subscriptions');
    }

    // Check if tables exist
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['conversation_context', 'ai_research_reports_personalized']);

    if (tableError) {
      console.log('   ⚠️  Could not verify tables (may not have permissions)');
    } else if (tables) {
      if (tables.some(t => t.table_name === 'conversation_context')) {
        console.log('   ✅ conversation_context table created');
      }
      if (tables.some(t => t.table_name === 'ai_research_reports_personalized')) {
        console.log('   ✅ ai_research_reports_personalized table created');
      }
    }

    console.log('');
    console.log('🎉 AIR schema is ready!');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Check if exec_sql function exists, if not provide alternative instructions
async function checkExecSqlFunction() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });

  if (error && error.message.includes('Could not find the function')) {
    console.error('❌ The exec_sql RPC function is not available in your Supabase project.');
    console.error('');
    console.error('📝 Please run the migration manually:');
    console.error('   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor');
    console.error('   2. Open SQL Editor');
    console.error('   3. Copy the contents of: migrations/002_air_personalized_schema.sql');
    console.error('   4. Paste and run the SQL');
    console.error('');
    return false;
  }

  return true;
}

// Main execution
(async () => {
  const hasExecSql = await checkExecSqlFunction();

  if (!hasExecSql) {
    console.log('');
    console.log('💡 Alternative: Use Supabase Dashboard SQL Editor');
    console.log('   Migration file: migrations/002_air_personalized_schema.sql');
    process.exit(1);
  }

  await runMigration();
})();
