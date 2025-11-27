/**
 * Apply migration 010: Add web_scraper source type
 * Run this with: npm run build && node dist/scripts/apply_migration_010.js
 */

async function applyMigration() {
  console.log('🔧 Applying migration 010: Add web_scraper source type');

  try {
    // Execute the migration SQL directly
    const sql = `
      -- Drop existing constraint
      ALTER TABLE user_sources
      DROP CONSTRAINT IF EXISTS user_sources_kind_check;

      -- Add new constraint with web_scraper
      ALTER TABLE user_sources
      ADD CONSTRAINT user_sources_kind_check
      CHECK (kind IN ('rss', 'http_json', 'web_scraper'));
    `;

    console.log('Executing SQL...');
    console.log(sql);

    // Since Supabase doesn't expose direct SQL execution via RPC by default,
    // we'll need to run this manually via the Supabase dashboard
    console.log('\n⚠️  MANUAL STEP REQUIRED:');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('Dashboard > SQL Editor > New query\n');
    console.log('--- Copy the SQL below ---');
    console.log(sql);
    console.log('--- End SQL ---\n');

    console.log('After running the SQL, the web_scraper source type will be available.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
