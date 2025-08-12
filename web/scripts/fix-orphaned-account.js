#!/usr/bin/env node

// Fix orphaned auth accounts that have no sms_subscriber record
// Run with: node scripts/fix-orphaned-account.js

const { createClient } = require('@supabase/supabase-js');
const { uniqueNamesGenerator, adjectives, animals } = require('unique-names-generator');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrphanedAccount(email) {
  console.log(`\n🔧 Fixing orphaned account: ${email}\n`);
  
  try {
    // 1. Find the auth user
    console.log('1️⃣ Finding auth user...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);
    
    if (!authUser) {
      console.error('❌ No auth user found with that email');
      return;
    }
    
    console.log(`✅ Found auth user: ${authUser.id}`);
    
    // 2. Check if subscriber record exists
    console.log('\n2️⃣ Checking for existing subscriber record...');
    const { data: existing } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('supabase_id', authUser.id)
      .single();
    
    if (existing) {
      console.log('✅ Subscriber record already exists:');
      console.log(`   Slug: @${existing.slug}`);
      console.log(`   Phone: ${existing.phone_number}`);
      return;
    }
    
    console.log('⚠️ No subscriber record found - creating one...');
    
    // 3. Generate unique slug
    console.log('\n3️⃣ Generating unique slug...');
    let slug = '';
    let attempts = 0;
    
    while (attempts < 10) {
      slug = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: '',
        style: 'lowerCase'
      });
      
      const { data: existingSlug } = await supabase
        .from('sms_subscribers')
        .select('slug')
        .eq('slug', slug)
        .single();
      
      if (!existingSlug) break;
      attempts++;
    }
    
    console.log(`✅ Generated slug: @${slug}`);
    
    // 4. Create subscriber record with placeholder phone
    console.log('\n4️⃣ Creating subscriber record...');
    const placeholderPhone = '+1555' + Math.floor(1000000 + Math.random() * 9000000);
    
    const { data: newSubscriber, error: createError } = await supabase
      .from('sms_subscribers')
      .insert({
        supabase_id: authUser.id,
        email: email,
        slug: slug,
        role: 'coder',
        phone_number: placeholderPhone,
        consent_given: true,
        confirmed: true,
        email_confirmed: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create subscriber:', createError);
      return;
    }
    
    console.log('✅ Successfully created subscriber record:');
    console.log(`   ID: ${newSubscriber.id}`);
    console.log(`   Slug: @${newSubscriber.slug}`);
    console.log(`   Phone: ${newSubscriber.phone_number} (placeholder)`);
    console.log('\n🎉 Account fixed! You can now link a real phone number.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Fix the specific account
fixOrphanedAccount('bartdecrem+13@gmail.com');