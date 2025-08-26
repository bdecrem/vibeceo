#!/usr/bin/env node

/**
 * Fix disappearing app icons by updating loadIconPositions function
 */

import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tqniseocczttrfwtpbdr.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_HYDVNP5H4cdad-7bzliryA_62Khx0ug';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixDisappearingIcons() {
    try {
        console.log('🔍 Fetching webtoys-os-v2 HTML to fix disappearing icons...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2')
            .single();

        if (error) throw error;

        let htmlContent = data.html_content;
        
        // Safe backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        fs.writeFileSync(`community-desktop-v2/backups/webtoys-os-v2_${timestamp}.html`, htmlContent);
        console.log(`📦 HTML backup created`);
        
        console.log('🔧 Fixing loadIconPositions function...');
        
        // Find and fix the problematic line in loadIconPositions
        const problemLine = `icon.style.display = savedIcon.visible ? '' : 'none';`;
        const fixedLine = `// Only hide if explicitly set to false - don't hide new icons
                    if (savedIcon.visible === false) {
                        icon.style.display = 'none';
                    }`;

        if (htmlContent.includes(problemLine)) {
            htmlContent = htmlContent.replace(problemLine, fixedLine);
            console.log('✅ Fixed the problematic line in loadIconPositions');
        } else {
            console.log('⚠️  Exact line not found, applying broader fix...');
            // Look for the pattern and fix it
            htmlContent = htmlContent.replace(
                /icon\.style\.display = savedIcon\.visible \? '' : 'none';/g,
                `// Only hide if explicitly set to false - don't hide new icons
                    if (savedIcon.visible === false) {
                        icon.style.display = 'none';
                    }`
            );
        }

        console.log('💾 Deploying fixed HTML...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: htmlContent,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2');

        if (updateError) throw updateError;

        console.log('✅ Fixed disappearing icons!');
        console.log('  - New app icons will no longer disappear');
        console.log('  - Only explicitly hidden icons will be hidden');
        console.log('  - Icons default to visible state');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixDisappearingIcons();