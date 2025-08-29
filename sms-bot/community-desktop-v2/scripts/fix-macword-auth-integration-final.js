import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
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

async function fixAuthIntegration() {
  try {
    console.log('🔧 Fixing MacWord authentication integration...');
    
    // Create backup timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Fetch current ToyBox OS
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

    // Create backup
    fs.writeFileSync(`/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-os_auth_fix_backup_${Date.now()}.html`, toyboxData.html_content);
    console.log('✅ ToyBox OS backup created');

    let toyboxHtml = toyboxData.html_content;

    // CRITICAL FIX: Make REQUEST_AUTH handler send currentUser instead of currentToyBoxUser
    const oldRequestAuthHandler = `        if (event.data && event.data.type === 'REQUEST_AUTH') {
            console.log('ToyBox OS received auth request, sending:', currentToyBoxUser);
            // Send current auth state back
            if (event.source) {
                event.source.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentToyBoxUser
                }, '*');
            }
        }`;

    const newRequestAuthHandler = `        if (event.data && event.data.type === 'REQUEST_AUTH') {
            console.log('ToyBox OS received auth request, sending currentUser:', currentUser);
            // Send current auth state back
            if (event.source) {
                event.source.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentUser
                }, '*');
            }
        }`;

    toyboxHtml = toyboxHtml.replace(oldRequestAuthHandler, newRequestAuthHandler);

    // ADDITIONAL FIX: Synchronize currentUser and currentToyBoxUser when logging in
    // Find the function that sets currentToyBoxUser and also set currentUser
    const oldToyBoxUserSetter = `                currentToyBoxUser = user.content_data;
                localStorage.setItem('toybox_user', JSON.stringify(currentToyBoxUser));`;

    const newToyBoxUserSetter = `                currentToyBoxUser = user.content_data;
                currentUser = user.content_data; // SYNC: Keep both variables in sync
                localStorage.setItem('toybox_user', JSON.stringify(currentToyBoxUser));`;

    toyboxHtml = toyboxHtml.replace(oldToyBoxUserSetter, newToyBoxUserSetter);

    // ADDITIONAL FIX: When registering new users, sync both variables
    const oldRegisterSync = `        currentToyBoxUser = userData;`;
    const newRegisterSync = `        currentToyBoxUser = userData;
        currentUser = userData; // SYNC: Keep both variables in sync`;

    toyboxHtml = toyboxHtml.replace(oldRegisterSync, newRegisterSync);

    // ADDITIONAL FIX: When logging out, clear both variables
    const oldLogoutClear = `        currentToyBoxUser = null;`;
    const newLogoutClear = `        currentToyBoxUser = null;
        currentUser = null; // SYNC: Keep both variables in sync`;

    toyboxHtml = toyboxHtml.replace(oldLogoutClear, newLogoutClear);

    // ADDITIONAL FIX: On initialization, sync both variables
    const oldInitSync = `                currentToyBoxUser = JSON.parse(savedUser);`;
    const newInitSync = `                currentToyBoxUser = JSON.parse(savedUser);
                currentUser = currentToyBoxUser; // SYNC: Keep both variables in sync`;

    toyboxHtml = toyboxHtml.replace(oldInitSync, newInitSync);

    // Update ToyBox OS in Supabase
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        html_content: toyboxHtml,
        updated_at: new Date().toISOString()
      })
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-os');

    if (updateError) {
      console.error('Error updating ToyBox OS:', updateError);
      return;
    }

    console.log('✅ ToyBox OS authentication integration fixed!');
    console.log('');
    console.log('🔧 Changes made:');
    console.log('  1. REQUEST_AUTH handler now sends currentUser instead of currentToyBoxUser');
    console.log('  2. All auth operations now sync both currentUser and currentToyBoxUser');
    console.log('  3. MacWord should now receive proper auth state from ToyBox OS');
    console.log('');
    console.log('🧪 To test:');
    console.log('  1. Refresh ToyBox OS');
    console.log('  2. Login via profile icon in upper right');
    console.log('  3. Open MacWord windowed app');
    console.log('  4. MacWord should show your username in lower right corner');
    console.log('  5. Save/Open operations should work');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixAuthIntegration();