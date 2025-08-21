#!/usr/bin/env node

// Run the payment fields migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔧 Running payment fields migration...\n');
  
  const migrations = [
    // Add payment customer ID
    'ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS payment_customer_id VARCHAR(255);',
    
    // Add subscription ID  
    'ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);',
    
    // Add subscription status
    'ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);',
    
    // Add subscription plan
    'ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT \'free\';',
    
    // Add subscription expiration
    'ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;',
    
    // Add indexes
    'CREATE INDEX IF NOT EXISTS idx_sms_subscribers_payment_customer_id ON sms_subscribers(payment_customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_sms_subscribers_subscription_status ON sms_subscribers(subscription_status);',
    'CREATE INDEX IF NOT EXISTS idx_sms_subscribers_subscription_plan ON sms_subscribers(subscription_plan);'
  ];
  
  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    console.log(`${i + 1}. Running: ${sql.substring(0, 80)}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error(`❌ Error: ${error.message}`);
      } else {
        console.log('✅ Success');
      }
    } catch (error) {
      console.error(`❌ Exception: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Verify the columns were added
  console.log('🔍 Verifying migration...');
  const { data, error } = await supabase
    .from('sms_subscribers')
    .select('id, phone_number, credits_remaining, payment_customer_id, subscription_plan')
    .eq('phone_number', '+16508989508')
    .limit(1);
    
  if (error) {
    console.error('❌ Verification failed:', error.message);
  } else {
    console.log('✅ Migration verified! Sample record:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

runMigration();