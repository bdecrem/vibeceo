#!/usr/bin/env node
/**
 * Test script for full arXiv agent pipeline
 * Loads environment variables and runs the complete workflow
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from sms-bot/.env.local
const envPath = resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);
config({ path: envPath });

// Verify critical variables
console.log('\nEnvironment check:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`);
console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'}`);
console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING'}`);
console.log(`PYTHON_BIN: ${process.env.PYTHON_BIN || 'default'}`);
console.log('');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Import and run the agent (from compiled dist/)
import('../../dist/agents/arxiv-research/index.js').then(async (module) => {
  try {
    console.log('Starting full arXiv pipeline...\n');

    const result = await module.runAndStoreArxivReport({
      date: '2025-10-17'
    });

    console.log('\n✅ SUCCESS!');
    console.log('Results:', {
      date: result.date,
      totalPapers: result.totalPapers,
      featuredCount: result.featuredCount,
      notableAuthors: result.notableAuthorsCount,
      reportPath: result.reportPath,
    });

  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  }
});
