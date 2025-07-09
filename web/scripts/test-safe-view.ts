/**
 * Test script to verify the safe view works correctly
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSafeView() {
  console.log('🧪 Testing safe view access...\n')

  try {
    // Test 1: Try to read from public view (should work)
    console.log('1️⃣ Testing public view access...')
    const { data: publicData, error: publicError } = await supabase
      .from('sms_subscribers_public')
      .select('*')
      .limit(1)

    if (publicError) {
      console.error('❌ Public view error:', publicError.message)
    } else {
      console.log('✅ Public view works! Columns available:', Object.keys(publicData[0] || {}))
    }

    // Test 2: Try to read PII from main table (should fail)
    console.log('\n2️⃣ Testing main table PII access (should fail)...')
    const { data: piiData, error: piiError } = await supabase
      .from('sms_subscribers')
      .select('phone_number, email')
      .limit(1)

    if (piiError) {
      console.log('✅ PII access blocked:', piiError.message)
    } else {
      console.log('❌ PII access NOT blocked - this is a problem!')
    }

    // Test 3: Try to insert new subscriber (should work)
    console.log('\n3️⃣ Testing subscriber creation...')
    const testPhone = `+1555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`
    
    const { data: insertData, error: insertError } = await supabase
      .from('sms_subscribers')
      .insert({
        phone_number: testPhone,
        consent_given: true,
        confirmed: false,
        unsubscribed: false,
        opt_in_date: new Date().toISOString(),
        role: 'user'  // Add valid role to satisfy constraint
      })

    if (insertError) {
      console.error('❌ Insert error:', insertError.message)
    } else {
      console.log('✅ Insert works!')
      
      // Clean up test data
      await supabase
        .from('sms_subscribers')
        .delete()
        .eq('phone_number', testPhone)
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testSafeView() 