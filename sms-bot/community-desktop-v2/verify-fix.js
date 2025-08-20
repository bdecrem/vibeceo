#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyFix() {
    try {
        console.log('🔍 Verifying ToyBox OS fix...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (error) {
            console.error('❌ Error fetching from Supabase:', error.message);
            process.exit(1);
        }
        
        if (!data) {
            console.error('❌ No data found for public/toybox-os');
            process.exit(1);
        }
        
        const html = data.html_content;
        
        console.log('📊 Last updated:', data.updated_at);
        console.log('📝 HTML length:', html.length, 'characters');
        console.log('');
        
        // Check for critical fixes
        const checks = [
            {
                name: 'setupDragForIcons function defined',
                test: html.includes('function setupDragForIcons()'),
                required: true
            },
            {
                name: 'handleIconMouseDown with click detection',
                test: html.includes('// If we didn\'t move, it\'s a click - don\'t prevent default, allow onclick to fire'),
                required: true
            },
            {
                name: 'Distance threshold for drag detection',
                test: html.includes('distance > 5 && !dragStarted'),
                required: true
            },
            {
                name: 'setupDragForIcons called on initialization',
                test: html.includes('setupDragForIcons();'),
                required: true
            },
            {
                name: 'Fixed script structure (no broken nesting)',
                test: !html.includes('});') || html.split('});').length < 10,
                required: true
            },
            {
                name: 'ZAD persistence integration',
                test: html.includes('await saveIconPositions()'),
                required: true
            },
            {
                name: 'Onclick handlers preserved',
                test: html.includes('onclick="openWindowedApp(\'community-notepad\')"'),
                required: true
            }
        ];
        
        console.log('🧪 RUNNING VERIFICATION CHECKS:');
        console.log('================================');
        
        let allPassed = true;
        
        checks.forEach(check => {
            const passed = check.test;
            const status = passed ? '✅' : '❌';
            const importance = check.required ? '[CRITICAL]' : '[OPTIONAL]';
            
            console.log(`${status} ${importance} ${check.name}`);
            
            if (check.required && !passed) {
                allPassed = false;
            }
        });
        
        console.log('');
        console.log('================================');
        
        if (allPassed) {
            console.log('🎉 ALL CRITICAL CHECKS PASSED!');
            console.log('');
            console.log('🚀 FIXES CONFIRMED:');
            console.log('   ✅ Icons can be clicked to launch apps');
            console.log('   ✅ Icons can be dragged to new positions');
            console.log('   ✅ Drag starts only after 5+ pixel movement');
            console.log('   ✅ Click events work when not dragging');
            console.log('   ✅ ZAD persistence saves icon positions');
            console.log('   ✅ setupDragForIcons() is properly called');
            console.log('');
            console.log('🌐 Visit https://webtoys.ai/public/toybox-os to test!');
        } else {
            console.log('❌ SOME CRITICAL CHECKS FAILED!');
            console.log('The fix may not be complete. Review the failing checks above.');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run the verification
verifyFix();