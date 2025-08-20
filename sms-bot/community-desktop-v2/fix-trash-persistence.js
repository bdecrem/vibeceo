#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

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

async function fixTrashPersistence() {
    try {
        console.log('🔧 Fixing trash persistence in ToyBox OS...');
        
        // Fetch current HTML from database
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (error) {
            console.error('❌ Error fetching from Supabase:', error.message);
            process.exit(1);
        }
        
        const htmlContent = data.html_content;
        
        console.log('🎯 Fixing loadIconPositions to hide deleted icons...');
        
        // Replace the loadIconPositions function to hide icons not in saved data
        const fixedHtml = htmlContent.replace(
            /async function loadIconPositions\(\) \{[\s\S]*?icons\.forEach\(function\(icon\) \{[\s\S]*?\}\);/,
            `async function loadIconPositions() {
            try {
                const response = await fetch('/api/zad/load', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        app_id: 'toybox-desktop-layout',
                        action_type: 'desktop_state',
                        participant_id: 'global'
                    })
                });
                
                if (!response.ok) {
                    console.log('No saved layout found, using default positions');
                    return;
                }
                
                const result = await response.json();
                
                // ZAD API returns { data: [...] } structure
                const dataArray = result.data || result;
                const layoutData = dataArray && dataArray.length > 0 ? dataArray[0] : null;
                
                if (layoutData && layoutData.content_data && layoutData.content_data.icons) {
                    const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
                    const savedIcons = layoutData.content_data.icons;
                    
                    icons.forEach(function(icon) {
                        const label = icon.querySelector('.label').textContent;
                        const id = label.toLowerCase().replace(/[^a-z0-9]/g, '');
                        
                        if (savedIcons[id]) {
                            // Icon exists in saved data - position it
                            const savedIcon = savedIcons[id];
                            icon.style.left = savedIcon.x + 'px';
                            icon.style.top = savedIcon.y + 'px';
                            icon.style.display = savedIcon.visible !== false ? '' : 'none';
                        } else {
                            // Icon NOT in saved data - it was deleted, hide it!
                            icon.style.display = 'none';
                            console.log('🗑️ Hiding deleted icon:', label);
                        }
                    });
                    
                    console.log('✅ Desktop layout loaded from server');
                } else {
                    // No saved data at all - this is first run, show all icons
                    console.log('First run - showing all icons at default positions');
                }
            } catch (error) {
                console.error('Error loading desktop layout:', error);
            }
        }`
        );
        
        console.log('📝 Updating ToyBox OS in database...');
        
        // Update the database
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: fixedHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) {
            console.error('❌ Error updating Supabase:', updateError.message);
            process.exit(1);
        }
        
        console.log('✅ Successfully fixed trash persistence!');
        console.log('   - Icons NOT in saved data will now be hidden (treated as deleted)');
        console.log('   - First run (no saved data) will show all icons');
        console.log('   - Deleted icons will stay deleted across refreshes');
        
        // Save fixed version locally for verification
        fs.writeFileSync('fixed-trash-toybox-os.html', fixedHtml);
        console.log('💾 Saved fixed version to fixed-trash-toybox-os.html');
        
        console.log('\n🎉 Trash persistence fix applied successfully!');
        console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
        console.log('\nTo test:');
        console.log('1. Drag an icon to trash and confirm deletion');
        console.log('2. Refresh the page');
        console.log('3. The deleted icon should NOT reappear');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run the script
fixTrashPersistence();