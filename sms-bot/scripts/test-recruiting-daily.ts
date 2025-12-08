#!/usr/bin/env node

/**
 * Test script to trigger recruiting daily candidate collection and sending
 * Uses mock Twilio client to capture messages instead of sending real SMS
 * 
 * Usage: npx tsx scripts/test-recruiting-daily.ts +15555551234
 */

// CRITICAL: Load environment variables BEFORE any imports that use Supabase
// lib/supabase.ts checks env vars at module load time, so we must load them first
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - try multiple locations
// When running with tsx, __dirname is sms-bot/scripts/, so go up one level to sms-bot/
const envPaths = [
  path.join(__dirname, '../.env.local'),      // From scripts/ to sms-bot/.env.local
  path.join(__dirname, '../../.env.local'),    // From scripts/ to root/.env.local (fallback)
  path.join(process.cwd(), 'sms-bot/.env.local'), // From root to sms-bot/.env.local
  path.join(process.cwd(), '.env.local'),      // Current working directory
];

console.log(`🔍 Looking for .env.local file...`);
console.log(`   Script directory: ${__dirname}`);
console.log(`   Current working directory: ${process.cwd()}`);

let envLoaded = false;
for (const envPath of envPaths) {
  const resolvedPath = path.resolve(envPath);
  console.log(`   Checking: ${resolvedPath}`);
  if (existsSync(resolvedPath)) {
    const result = dotenv.config({ path: resolvedPath });
    if (result.error) {
      console.error(`   ❌ Error loading ${resolvedPath}:`, result.error);
      continue;
    }
    console.log(`✅ Loaded environment from: ${resolvedPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log(`⚠️  No .env.local found in expected locations, trying default...`);
  dotenv.config(); // Try default location
}

// Verify critical env vars are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('');
  console.error('❌ Environment variables not loaded properly!');
  console.error(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌ MISSING'}`);
  console.error(`   SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌ MISSING'}`);
  console.error('');
  console.error('💡 Make sure you are running from the sms-bot directory or root directory');
  console.error('   and that sms-bot/.env.local exists with SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Import type only (doesn't trigger module execution)
import type { TwilioClient } from '../lib/sms/webhooks.js';
// NOTE: We use dynamic import for collectAndSendCandidatesForSubscriber
// because it transitively imports supabase.ts, which checks env vars at module load time

/**
 * Create a mock Twilio client that logs messages instead of sending
 * Similar to the dev reroute mock client
 */
function createMockTwilioClient(): TwilioClient {
  return {
    messages: {
      create: async (params: any) => {
        console.log('');
        console.log('─'.repeat(80));
        console.log('📱 SMS MESSAGE (would be sent via Twilio):');
        console.log('─'.repeat(80));
        console.log(`To: ${params.to}`);
        console.log(`From: ${params.from}`);
        console.log('');
        console.log(params.body);
        console.log('─'.repeat(80));
        console.log('');
        
        return {
          sid: `TEST${Date.now()}`,
          to: params.to,
          from: params.from,
          body: params.body,
          status: 'mock',
          dateCreated: new Date(),
          dateUpdated: new Date(),
          dateSent: new Date(),
          mock: true
        } as any;
      }
    }
  } as any as TwilioClient;
}

async function main(): Promise<void> {
  // Get phone number from command line
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.error('❌ Error: Phone number required');
    console.error('Usage: npx tsx scripts/test-recruiting-daily.ts +15555551234');
    process.exit(1);
  }

  // Validate phone number format (basic check)
  if (!phoneNumber.startsWith('+')) {
    console.error('❌ Error: Phone number must start with + (e.g., +15555551234)');
    process.exit(1);
  }

  console.log('');
  console.log('🧪 Testing Recruiting Daily Candidate Collection');
  console.log('─'.repeat(80));
  console.log(`📱 Phone Number: ${phoneNumber}`);
  console.log(`🧪 Using mock Twilio client (no real SMS will be sent)`);
  console.log('─'.repeat(80));
  console.log('');

  // Create mock Twilio client
  const mockTwilioClient = createMockTwilioClient();

  try {
    // Dynamically import the function AFTER env vars are loaded
    // This prevents supabase.ts from loading before env vars are available
    const { collectAndSendCandidatesForSubscriber } = await import('../lib/sms/recruiting-scheduler.js');
    
    // Call the collection function with skip options for testing
    await collectAndSendCandidatesForSubscriber(
      phoneNumber,
      mockTwilioClient,
      {
        skipTodayCheck: true, // Allow testing even if already sent today
        skipDaysRemainingCheck: true // Allow testing even if project expired
      }
    );

    console.log('');
    console.log('✅ Test completed successfully!');
    console.log('📱 Check the messages above to see what would be sent via SMS');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Test failed:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    process.exit(1);
  }
}

// Run the test
main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });

