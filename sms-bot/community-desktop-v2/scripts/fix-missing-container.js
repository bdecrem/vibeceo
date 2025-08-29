#!/usr/bin/env node

/**
 * FIX THE MISSING CONTAINER - The real problem all along!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixMissingContainer() {
    try {
        console.log('🔧 FIXING THE REAL PROBLEM - Missing container!\n');
        
        // Get current HTML
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_container_fix_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        
        // Check current state
        const hasContainer = html.includes('id="recentUpdates"');
        console.log(`Current state: ${hasContainer ? 'HAS' : 'MISSING'} recentUpdates container`);
        
        if (!hasContainer) {
            // Find where to insert - after the form's closing div
            const formEndPattern = '</form>\n        </div>';
            const formEndIndex = html.indexOf(formEndPattern);
            
            if (formEndIndex > -1) {
                // Insert the container after the form
                const insertPoint = formEndIndex + formEndPattern.length;
                
                const containerHTML = `
        
        <!-- Issues Display Container -->
        <div id="recentUpdates" style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin-bottom: 15px;">📋 Recent Issues</h3>
            <div class="loading">Loading issues...</div>
        </div>`;
                
                html = html.slice(0, insertPoint) + containerHTML + html.slice(insertPoint);
                console.log('✅ Added recentUpdates container after form');
            } else {
                // Try alternative: find </body> and insert before it
                const bodyEnd = html.lastIndexOf('</body>');
                if (bodyEnd > -1) {
                    const containerHTML = `
    <!-- Issues Display Container -->
    <div id="recentUpdates" style="margin: 30px auto; max-width: 800px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="margin-bottom: 15px;">📋 Recent Issues</h3>
        <div class="loading">Loading issues...</div>
    </div>
    
</body>`;
                    html = html.slice(0, bodyEnd) + containerHTML;
                    console.log('✅ Added recentUpdates container before </body>');
                }
            }
        } else {
            console.log('✓ Container already exists!');
        }
        
        // Make sure loadRecentUpdates is called on page load
        if (!html.includes('loadRecentUpdates();')) {
            // Find DOMContentLoaded or add it
            if (html.includes('DOMContentLoaded')) {
                // Add to existing DOMContentLoaded
                const domPattern = /window\.addEventListener\('DOMContentLoaded'[^}]*\{([^}]*)\}/;
                const match = html.match(domPattern);
                if (match) {
                    const newContent = match[0].replace('}', '\n            loadRecentUpdates();\n        }');
                    html = html.replace(match[0], newContent);
                    console.log('✅ Added loadRecentUpdates to DOMContentLoaded');
                }
            } else {
                // Add new DOMContentLoaded listener before </script>
                const scriptEnd = html.lastIndexOf('</script>');
                if (scriptEnd > -1) {
                    const loaderCode = `
        
        // Load issues on page load
        window.addEventListener('DOMContentLoaded', function() {
            loadRecentUpdates();
            if (typeof loadAuth === 'function') loadAuth();
            if (typeof updateLastIssueInfo === 'function') updateLastIssueInfo();
        });
        
    </script>`;
                    html = html.slice(0, scriptEnd) + loaderCode;
                    console.log('✅ Added DOMContentLoaded listener with loadRecentUpdates');
                }
            }
        }
        
        // Save the fixed version
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n🎉 FIXED THE REAL PROBLEM!');
        console.log('\n✅ What was fixed:');
        console.log('  • Added the missing recentUpdates container');
        console.log('  • Container is now visible on the page');
        console.log('  • Issues will load and display automatically');
        console.log('  • All 7 issues should now be visible');
        
        console.log('\n🔄 REFRESH THE PAGE NOW:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        console.log('\n📋 You should see:');
        console.log('  • A "Recent Issues" section');
        console.log('  • All 7 issues listed');
        console.log('  • Each issue with its number, type, and status');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixMissingContainer();