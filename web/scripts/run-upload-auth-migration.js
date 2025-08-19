#!/usr/bin/env node

// Script to add upload auth columns to sms_subscribers table
// Run this to enable the upload authentication system

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables from sms-bot/.env.local
const envPath = '../sms-bot/.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in sms-bot/.env.local');
  console.error('Need: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Adding upload auth columns to sms_subscribers table...\n');

  try {
    // Add the columns
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.sms_subscribers 
        ADD COLUMN IF NOT EXISTS upload_auth_code TEXT,
        ADD COLUMN IF NOT EXISTS upload_auth_expires TIMESTAMP WITH TIME ZONE;
      `
    });

    if (alterError) {
      console.error('❌ Failed to add columns:', alterError.message);
      process.exit(1);
    }

    console.log('✅ Columns added successfully');

    // Add index
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_subscribers_upload_auth 
          ON public.sms_subscribers (upload_auth_code, upload_auth_expires) 
          WHERE upload_auth_code IS NOT NULL;
      `
    });

    if (indexError) {
      console.log('⚠️  Index creation failed (non-critical):', indexError.message);
    } else {
      console.log('✅ Index created successfully');
    }

    // Test the setup
    console.log('\n🧪 Testing upload auth system...');
    
    const { data: testUser, error: userError } = await supabase
      .from('sms_subscribers')
      .select('id, slug, role, upload_auth_code, upload_auth_expires')
      .eq('slug', 'bart')
      .single();

    if (userError) {
      console.log('⚠️  Could not find test user "bart"');
    } else {
      console.log(`✅ Found user: ${testUser.slug} (role: ${testUser.role})`);
      
      const allowedRoles = ['degen', 'admin', 'operator'];
      if (allowedRoles.includes(testUser.role)) {
        console.log('✅ User has upload access');
      } else {
        console.log('❌ User needs DEGEN+ role for uploads');
      }
    }

    console.log('\n🎉 Upload authentication system is ready!');
    console.log('Try visiting: https://webtoys.ai/bart/uploads');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();