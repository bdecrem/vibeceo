import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAuthFix() {
  try {
    console.log('🔍 Verifying authentication fix...');
    
    // Fetch updated ToyBox OS
    const { data: toyboxData, error: toyboxError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-os')
      .single();

    if (toyboxError) {
      console.error('Error fetching ToyBox OS:', toyboxError);
      return;
    }

    const html = toyboxData.html_content;

    // Verify fixes
    const checks = [
      {
        name: 'REQUEST_AUTH handler sends currentUser',
        test: html.includes('user: currentUser') && html.includes('REQUEST_AUTH'),
        expected: true
      },
      {
        name: 'Auth synchronization added',
        test: html.includes('currentUser = currentToyBoxUser; // SYNC: Keep both variables in sync'),
        expected: true
      },
      {
        name: 'Registration synchronization',
        test: html.includes('currentUser = userData; // SYNC: Keep both variables in sync'),
        expected: true
      },
      {
        name: 'Logout clears both variables', 
        test: html.includes('currentUser = null; // SYNC: Keep both variables in sync'),
        expected: true
      },
      {
        name: 'Old buggy handler removed',
        test: html.includes('user: currentToyBoxUser') && html.includes('REQUEST_AUTH'),
        expected: false
      }
    ];

    console.log('\n📊 Verification Results:');
    let allPassed = true;

    checks.forEach(check => {
      const passed = check.test === check.expected;
      const status = passed ? '✅' : '❌';
      console.log(`  ${status} ${check.name}`);
      if (!passed) {
        allPassed = false;
      }
    });

    console.log('\n📋 Summary:');
    if (allPassed) {
      console.log('✅ All fixes applied successfully!');
      console.log('✅ ToyBox OS should now properly send auth to MacWord');
    } else {
      console.log('❌ Some fixes may not have been applied correctly');
    }

    // Also verify MacWord hasn't changed
    const { data: macwordData, error: macwordError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', 'public')
      .eq('app_slug', 'macword')
      .single();

    if (macwordError) {
      console.error('Error fetching MacWord:', macwordError);
      return;
    }

    const macwordHtml = macwordData.html_content;
    const macwordChecks = [
      {
        name: 'MacWord has message listener',
        test: macwordHtml.includes("addEventListener('message'")
      },
      {
        name: 'MacWord listens for TOYBOX_AUTH',
        test: macwordHtml.includes('TOYBOX_AUTH')
      },
      {
        name: 'MacWord requests auth on load',
        test: macwordHtml.includes('REQUEST_AUTH')
      }
    ];

    console.log('\n📱 MacWord Status:');
    macwordChecks.forEach(check => {
      const status = check.test ? '✅' : '❌';
      console.log(`  ${status} ${check.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyAuthFix();