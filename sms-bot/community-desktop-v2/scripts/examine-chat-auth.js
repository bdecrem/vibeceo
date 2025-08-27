#!/usr/bin/env node

/**
 * Examine exactly how ToyBox Chat detects the logged-in user
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../../.env' });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function examineChat() {
    try {
        console.log('📥 Fetching ToyBox Chat app...\n');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-chat')
            .single();
        
        if (error || !data) {
            console.error('Error:', error?.message);
            return;
        }
        
        const html = data.html_content;
        
        console.log('🔍 HOW TOYBOX CHAT DETECTS USER "bart":\n');
        console.log('=' .repeat(60));
        
        // 1. Find the currentUser variable declaration
        console.log('\n1️⃣ STEP 1: currentUser Variable Declaration\n');
        const userVarMatch = html.match(/let currentUser[^;]*;/);
        if (userVarMatch) {
            console.log('Found:', userVarMatch[0]);
        }
        
        // 2. Find localStorage reading
        console.log('\n2️⃣ STEP 2: Reading from localStorage\n');
        const localStorageStart = html.indexOf("localStorage.getItem('toybox_user')");
        if (localStorageStart > -1) {
            const codeBlock = html.substring(localStorageStart - 100, localStorageStart + 300);
            console.log('localStorage code:');
            console.log('-'.repeat(40));
            console.log(codeBlock);
            console.log('-'.repeat(40));
        }
        
        // 3. Find the message event listener for TOYBOX_AUTH
        console.log('\n3️⃣ STEP 3: Listening for TOYBOX_AUTH Messages\n');
        const toyboxAuthIndex = html.indexOf('TOYBOX_AUTH');
        if (toyboxAuthIndex > -1) {
            const listenerStart = html.lastIndexOf('window.addEventListener', toyboxAuthIndex);
            const listenerEnd = html.indexOf('});', toyboxAuthIndex) + 3;
            const listenerCode = html.substring(listenerStart, listenerEnd);
            console.log('Message listener code:');
            console.log('-'.repeat(40));
            console.log(listenerCode);
            console.log('-'.repeat(40));
        }
        
        // 4. Find how currentUser.handle is accessed
        console.log('\n4️⃣ STEP 4: How currentUser.handle is Used\n');
        const handleUsages = html.match(/currentUser[^;]*handle[^;]*/g);
        if (handleUsages) {
            console.log('Found usages:');
            handleUsages.slice(0, 5).forEach((usage, i) => {
                console.log(`   ${i + 1}. ${usage}`);
            });
        }
        
        // 5. Extract the complete authentication initialization
        console.log('\n5️⃣ STEP 5: Complete Auth Initialization\n');
        const domContentStart = html.indexOf("window.addEventListener('DOMContentLoaded'");
        if (domContentStart > -1) {
            const domContentEnd = html.indexOf('});', domContentStart) + 3;
            const initCode = html.substring(domContentStart, domContentEnd);
            console.log('Initialization on page load:');
            console.log('-'.repeat(40));
            console.log(initCode);
            console.log('-'.repeat(40));
        }
        
        console.log('\n📋 SUMMARY - Chat App Auth Pattern:\n');
        console.log('1. Declares: let currentUser = null;');
        console.log('2. On page load: Reads localStorage.getItem("toybox_user")');
        console.log('3. Parses JSON: currentUser = JSON.parse(savedUser)');
        console.log('4. Listens for: event.data.type === "TOYBOX_AUTH" messages');
        console.log('5. Updates: currentUser = event.data.user');
        console.log('6. Uses: currentUser.handle to get username');
        console.log('\n✅ Key insight: The user data comes from:');
        console.log('   - localStorage "toybox_user" (persisted)');
        console.log('   - postMessage from ToyBox OS parent (real-time)');
        console.log('   - Field used: currentUser.handle (NOT .username!)');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

examineChat();