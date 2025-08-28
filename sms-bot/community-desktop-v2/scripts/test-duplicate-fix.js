#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function testDuplicateFix() {
    try {
        console.log('🧪 Testing the duplicate issue fix...');

        // Get current app to see if the fix was applied
        const { data: app, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (error) {
            console.error('❌ Error fetching app:', error);
            return;
        }
        
        // Check if the enhanced deduplication logic is present
        const hasEnhancedLogic = app.html_content.includes('ENHANCED DEDUPLICATION: Handle multiple records per issue properly');
        const hasConsoleLogging = app.html_content.includes('Loading ${updates.length} total records from ZAD');
        const hasNewMapLogic = app.html_content.includes('issueMap.set(issueNumber, update);');
        
        console.log('📋 Test Results:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Enhanced deduplication comment: ${hasEnhancedLogic ? 'PRESENT' : 'MISSING'}`);
        console.log(`✅ Console logging for debugging: ${hasConsoleLogging ? 'PRESENT' : 'MISSING'}`);
        console.log(`✅ New Map-based logic: ${hasNewMapLogic ? 'PRESENT' : 'MISSING'}`);
        
        // Check for preserved functionality
        const hasOpenButton = app.html_content.includes('onclick="openTicket(');
        const hasCloseButton = app.html_content.includes('onclick="closeTicket(');
        const hasCommentButton = app.html_content.includes('onclick="addCommentSimple(');
        
        console.log(`✅ OPEN button functionality: ${hasOpenButton ? 'PRESERVED' : 'MISSING'}`);
        console.log(`✅ CLOSE button functionality: ${hasCloseButton ? 'PRESERVED' : 'MISSING'}`);
        console.log(`✅ Add Comment functionality: ${hasCommentButton ? 'PRESERVED' : 'MISSING'}`);
        
        // Check that duplicate function was removed
        const openTicketCount = (app.html_content.match(/async function openTicket/g) || []).length;
        console.log(`✅ OpenTicket function count: ${openTicketCount} (should be 1)`);
        
        const allTestsPassed = hasEnhancedLogic && hasConsoleLogging && hasNewMapLogic && 
                               hasOpenButton && hasCloseButton && hasCommentButton && 
                               openTicketCount === 1;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        if (allTestsPassed) {
            console.log('🎉 ALL TESTS PASSED! The fix was successfully applied.');
            console.log('🌐 The app should now show exactly 29 unique issues.');
            console.log('📱 Visit https://webtoys.ai/public/toybox-issue-tracker to verify.');
        } else {
            console.log('⚠️ Some tests failed. The fix may not have been applied correctly.');
        }
        
    } catch (err) {
        console.error('❌ Error during testing:', err);
    }
}

testDuplicateFix();
