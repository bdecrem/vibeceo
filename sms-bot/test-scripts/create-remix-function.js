#!/usr/bin/env node

// Script to create the increment_remix_credits function in Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sqlFunction = `
-- Create function to increment remix credits for a user
CREATE OR REPLACE FUNCTION increment_remix_credits(user_slug text)
RETURNS INTEGER AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current remix credits, default to 0 if NULL
    SELECT COALESCE(total_remix_credits, 0) INTO current_credits
    FROM sms_subscribers
    WHERE slug = user_slug;
    
    -- Increment by 1
    current_credits := current_credits + 1;
    
    -- Update the user's remix credits
    UPDATE sms_subscribers
    SET total_remix_credits = current_credits
    WHERE slug = user_slug;
    
    -- Return the new value
    RETURN current_credits;
END;
$$ LANGUAGE plpgsql;
`;

async function createFunction() {
  console.log('🔧 Creating increment_remix_credits function in Supabase...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlFunction });

    if (error) {
      console.error('❌ Failed to create function:', error);
      console.log('\n📝 Manual SQL to run in Supabase SQL Editor:');
      console.log(sqlFunction);
      return;
    }

    console.log('✅ Function created successfully!');
    
    // Test the function
    console.log('\n🧪 Testing the function...');
    const { data: testResult, error: testError } = await supabase
      .rpc('increment_remix_credits', { user_slug: 'bart' });

    if (testError) {
      console.error('❌ Function test failed:', testError);
    } else {
      console.log(`✅ Function test passed! Result: ${testResult}`);
    }

  } catch (error) {
    console.error('💥 Error:', error);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log(sqlFunction);
  }
}

createFunction(); 