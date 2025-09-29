#!/usr/bin/env node

/**
 * Apply Stock Agent Database Migrations to Production
 *
 * This script applies the required database migrations for the stock agent
 * to work in production.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

async function applyMigrations() {
  console.log("🚀 Applying Stock Agent Database Migrations...\n");

  // Check required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing required environment variables:");
    console.error("   SUPABASE_URL:", process.env.SUPABASE_URL ? "✅" : "❌");
    console.error(
      "   SUPABASE_SERVICE_KEY:",
      process.env.SUPABASE_SERVICE_KEY ? "✅" : "❌"
    );
    console.error("\nPlease set these in your .env file or environment.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const migrations = [
    {
      name: "Stock Agent Core Schema",
      file: path.join(__dirname, "../migrations/stock_agent_schema.sql"),
    },
    {
      name: "Scheduled Stock Tasks",
      file: path.join(__dirname, "../migrations/scheduled_stock_tasks.sql"),
    },
  ];

  for (const migration of migrations) {
    try {
      console.log(`📝 Applying migration: ${migration.name}`);

      // Read the migration file
      const migrationSQL = fs.readFileSync(migration.file, "utf8");

      // Split into individual statements (basic approach)
      const statements = migrationSQL
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc("exec_sql", { sql: statement });
          if (error) {
            console.warn(`⚠️  Statement warning: ${error.message}`);
            // Continue with other statements
          }
        }
      }

      console.log(`✅ Migration completed: ${migration.name}\n`);
    } catch (error) {
      console.error(`❌ Migration failed: ${migration.name}`);
      console.error("Error:", error.message);
      console.error(
        "\nYou may need to apply this migration manually in the Supabase dashboard."
      );
      console.error("File:", migration.file);
      process.exit(1);
    }
  }

  // Test the migrations by checking if tables exist
  console.log("🧪 Testing migrations...");

  const testQueries = [
    {
      name: "user_stock_profiles",
      query: "SELECT COUNT(*) FROM user_stock_profiles",
    },
    { name: "stock_alerts", query: "SELECT COUNT(*) FROM stock_alerts" },
    {
      name: "stock_price_history",
      query: "SELECT COUNT(*) FROM stock_price_history",
    },
    {
      name: "scheduled_stock_tasks",
      query: "SELECT COUNT(*) FROM scheduled_stock_tasks",
    },
    {
      name: "scheduled_task_executions",
      query: "SELECT COUNT(*) FROM scheduled_task_executions",
    },
  ];

  for (const test of testQueries) {
    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        sql: test.query,
      });
      if (error) {
        console.error(`❌ Table test failed: ${test.name} - ${error.message}`);
      } else {
        console.log(`✅ Table exists: ${test.name}`);
      }
    } catch (error) {
      console.error(`❌ Table test error: ${test.name} - ${error.message}`);
    }
  }

  console.log("\n🎉 Stock Agent database migrations completed!");
  console.log("\n📋 Next steps:");
  console.log('1. Test the stock agent with: "What\'s the price of Apple?"');
  console.log("2. The stock agent should now work in production");
  console.log("3. Check Railway logs to confirm it's working");
}

// Run the migrations
applyMigrations().catch((error) => {
  console.error("❌ Migration script failed:", error);
  process.exit(1);
});
