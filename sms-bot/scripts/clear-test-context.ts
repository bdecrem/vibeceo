#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from sms-bot/.env.local so we share config with the SMS bot
// Note: when compiled, this script runs from dist/scripts, so use ../../.env.local
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Match sms-bot/lib/supabase.ts config (service role key, not NEXT_PUBLIC)
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration (SUPABASE_URL / SUPABASE_SERVICE_KEY)');
  console.error('SUPABASE_URL:', SUPABASE_URL || 'MISSING');
  console.error(
    'SUPABASE_SERVICE_KEY:',
    SUPABASE_SERVICE_KEY ? `${SUPABASE_SERVICE_KEY.substring(0, 20)}...` : 'MISSING'
  );
  console.error('Make sure these are set in sms-bot/.env.local');
  process.exit(1);
}

// Hardcoded dev-reroute test phone number
const TEST_PHONE_NUMBER = '+15555551234';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearTestContext(): Promise<void> {
  console.log('🧪 Clearing SMS context for dev test number:', TEST_PHONE_NUMBER);

  // Look up subscriber for the test phone number
  const { data: subscriber, error: subscriberError } = await supabase
    .from('sms_subscribers')
    .select('id, phone_number')
    .eq('phone_number', TEST_PHONE_NUMBER)
    .limit(1)
    .single();

  if (subscriberError || !subscriber) {
    console.log('ℹ️ No sms_subscribers record found for test number. Nothing to clear.');
    process.exit(0);
  }

  console.log('✅ Found test subscriber with id:', subscriber.id);

  // Clear conversation_context rows
  const { data: contextDeleted, error: contextError } = await supabase
    .from('conversation_context')
    .delete()
    .eq('subscriber_id', subscriber.id)
    .select('id');

  if (contextError) {
    console.error('❌ Error clearing conversation_context:', contextError);
    process.exit(1);
  }

  const contextCount = Array.isArray(contextDeleted) ? contextDeleted.length : 0;
  console.log(`🧹 Deleted ${contextCount} conversation_context rows for test subscriber.`);

  // Clear queued messages for this subscriber
  const { data: queueDeleted, error: queueError } = await supabase
    .from('message_queue')
    .delete()
    .eq('subscriber_id', subscriber.id)
    .select('id');

  if (queueError) {
    console.error('❌ Error clearing message_queue:', queueError);
    process.exit(1);
  }

  const queueCount = Array.isArray(queueDeleted) ? queueDeleted.length : 0;
  console.log(`🧹 Deleted ${queueCount} message_queue rows for test subscriber.`);

  console.log('✅ Test context cleared for dev number. Safe to run dev-reroute with a clean slate.');
}

clearTestContext()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error while clearing test context:', error);
    process.exit(1);
  });


