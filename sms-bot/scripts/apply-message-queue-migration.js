#!/usr/bin/env node

/**
 * Apply Message Queue Migration to Supabase
 * 
 * This script applies the message_queue table and functions to your Supabase database.
 * Run this after deploying the code changes.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

async function applyMigration() {
  console.log("🚀 Applying Message Queue Migration...\n");

  // Check required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing required environment variables:");
    console.error("   SUPABASE_URL:", process.env.SUPABASE_URL ? "✅" : "❌");
    console.error(
      "   SUPABASE_SERVICE_KEY:",
      process.env.SUPABASE_SERVICE_KEY ? "✅" : "❌"
    );
    console.error("\nPlease set these in your .env.local file or environment.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    console.log("📝 Reading migration file...");
    const migrationPath = path.join(__dirname, "../migrations/008_message_queue.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📤 Executing migration SQL...");
    console.log("   (This may take a moment...)\n");

    // Supabase doesn't have a direct exec_sql RPC by default
    // We need to split the SQL and execute via REST API or use psql
    // For now, provide instructions to run manually
    
    console.log("⚠️  Supabase REST API doesn't support executing arbitrary SQL directly.");
    console.log("📋 Please apply this migration using one of these methods:\n");
    
    console.log("METHOD 1: Supabase Dashboard (Recommended)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Go to your Supabase project dashboard");
    console.log("2. Navigate to: SQL Editor");
    console.log("3. Click 'New Query'");
    console.log("4. Copy and paste the contents of:");
    console.log(`   ${migrationPath}`);
    console.log("5. Click 'Run' to execute");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("METHOD 2: Using psql (if you have direct database access)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Get your database connection string from Supabase:");
    console.log("   Settings → Database → Connection string → URI");
    console.log("2. Run:");
    console.log(`   psql "YOUR_CONNECTION_STRING" -f ${migrationPath}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Try to verify if migration was already applied
    console.log("🔍 Checking if migration was already applied...");
    const { data: tableCheck, error: tableError } = await supabase
      .from('message_queue')
      .select('id')
      .limit(1);

    if (!tableError) {
      console.log("✅ message_queue table already exists!");
      console.log("   Migration may have already been applied.\n");
    } else if (tableError.code === 'PGRST116') {
      console.log("❌ message_queue table does not exist.");
      console.log("   Please apply the migration using one of the methods above.\n");
    } else {
      console.log("⚠️  Could not verify table status:", tableError.message);
      console.log("   Please apply the migration using one of the methods above.\n");
    }

    // Check for functions
    console.log("🔍 Checking for required functions...");
    const { data: funcCheck, error: funcError } = await supabase.rpc('get_next_queued_message', {
      p_subscriber_id: null
    });

    if (!funcError) {
      console.log("✅ get_next_queued_message function exists!\n");
    } else {
      console.log("❌ Functions not found. Migration needs to be applied.\n");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\nPlease apply the migration manually using the Supabase dashboard.");
    process.exit(1);
  }
}

applyMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

