#!/usr/bin/env ts-node

/**
 * Run a Supabase migration file
 * Usage: ts-node scripts/run-migration.ts <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

async function runMigration(migrationFile: string) {
  console.log(`\n🚀 Running migration: ${migrationFile}\n`);

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Execute migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('Results:', data);

  } catch (err: any) {
    console.error('❌ Error running migration:', err.message);
    process.exit(1);
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: ts-node scripts/run-migration.ts <migration-file>');
  console.error('Example: ts-node scripts/run-migration.ts 008_kochi_intelligence_agents.sql');
  process.exit(1);
}

runMigration(migrationFile);
