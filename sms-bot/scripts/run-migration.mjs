#!/usr/bin/env node

/**
 * Run a Supabase migration file directly using PostgreSQL connection
 * Usage: node scripts/run-migration.mjs <migration-file>
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

// Extract project reference from Supabase URL
// Format: https://PROJECT_REF.supabase.co
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

// Construct direct Postgres connection string
// Supabase format: postgresql://postgres:[YOUR-PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres
const connectionString = `postgresql://postgres.${projectRef}:${SUPABASE_SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

async function runMigration(migrationFile) {
  console.log(`\n🚀 Running migration: ${migrationFile}\n`);

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('📡 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('⚙️  Executing migration SQL...\n');
    const result = await client.query(sql);

    console.log('✅ Migration completed successfully!\n');
    if (result && result.rowCount !== undefined) {
      console.log(`   Rows affected: ${result.rowCount}`);
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.mjs <migration-file>');
  console.error('Example: node scripts/run-migration.mjs 008_kochi_intelligence_agents.sql');
  process.exit(1);
}

runMigration(migrationFile);
