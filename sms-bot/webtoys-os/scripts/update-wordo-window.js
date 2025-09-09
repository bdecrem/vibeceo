#!/usr/bin/env node

/**
 * Update WordO Window Properties
 * Makes window fixed size and non-resizable
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function updateWordOWindow() {
    console.log('🎮 Updating WordO window properties...\n');
    
    try {
        // First, update the app registry to make window fixed size
        const { data: config, error: fetchError } = await supabase
            .from('wtaf_desktop_config')
            .select('*')
            .eq('desktop_version', 'webtoys-os-v3')
            .single();

        if (fetchError) {
            console.error('❌ Error fetching desktop config:', fetchError);
            return;
        }

        if (!config || !config.app_registry) {
            console.log('❌ No desktop config or app registry found');
            return;
        }

        // Find and update WordO app
        let wordOFound = false;
        const updatedRegistry = config.app_registry.map(app => {
            if (app.id.toLowerCase() === 'wordo' || app.name.toLowerCase() === 'wordo') {
                wordOFound = true;
                console.log(`📐 Found WordO app, updating window properties...`);
                return {
                    ...app,
                    width: 400,  // Exact width for content + minimal chrome
                    height: 650, // Height to accommodate all elements
                    resizable: false  // Make it non-resizable
                };
            }
            return app;
        });

        if (!wordOFound) {
            console.log('❌ WordO app not found in registry');
            return;
        }

        // Update the desktop config
        const { error: updateError } = await supabase
            .from('wtaf_desktop_config')
            .update({
                app_registry: updatedRegistry,
                updated_at: new Date().toISOString()
            })
            .eq('desktop_version', 'webtoys-os-v3');

        if (updateError) {
            console.error('❌ Error updating desktop config:', updateError);
            return;
        }

        console.log('✅ Updated WordO window properties in desktop config');
        
        // Now update the HTML to remove side padding
        console.log('\n📝 Updating WordO HTML to remove padding...');
        
        const htmlPath = path.join(__dirname, '../apps/wordO.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Update body and container styles to remove padding
        htmlContent = htmlContent.replace(
            /body\s*{([^}]+)}/,
            (match, styles) => {
                // Remove or set padding to 0
                let newStyles = styles.replace(/padding:\s*[^;]+;/g, '');
                // Ensure no padding
                return `body {${newStyles}
            padding: 0;
        }`;
            }
        );
        
        // Update game-container to remove padding
        htmlContent = htmlContent.replace(
            /\.game-container\s*{([^}]+)}/,
            (match, styles) => {
                let newStyles = styles.replace(/padding:\s*[^;]+;/g, 'padding: 10px;');
                return `.game-container {${newStyles}}`;
            }
        );
        
        // Update header padding to be more compact
        htmlContent = htmlContent.replace(
            /\.header\s*{([^}]+)}/,
            (match, styles) => {
                let newStyles = styles.replace(/padding:\s*[^;]+;/g, 'padding: 10px;');
                return `.header {${newStyles}}`;
            }
        );
        
        // Update words-found positioning to not have side margins
        htmlContent = htmlContent.replace(
            /\.words-found\s*{([^}]+)}/,
            (match, styles) => {
                let newStyles = styles
                    .replace(/left:\s*[^;]+;/g, 'left: 10px;')
                    .replace(/right:\s*[^;]+;/g, 'right: 10px;')
                    .replace(/bottom:\s*[^;]+;/g, 'bottom: 10px;');
                return `.words-found {${newStyles}}`;
            }
        );
        
        // Write updated HTML
        fs.writeFileSync(htmlPath, htmlContent);
        console.log('✅ Updated WordO HTML file');
        
        // Deploy the updated HTML to Supabase
        console.log('\n🚀 Deploying updated WordO to database...');
        
        const { error: deployError } = await supabase
            .from('wtaf_content')
            .upsert({
                user_slug: 'public',
                app_slug: 'toybox-wordo',
                html_content: htmlContent,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_slug,app_slug'
            });
        
        if (deployError) {
            console.error('❌ Error deploying to database:', deployError);
            return;
        }
        
        console.log('✅ Successfully deployed updated WordO to database');
        console.log('\n🎉 WordO window is now fixed size (400x650) and non-resizable!');
        console.log('🔄 The changes will take effect when the desktop is reloaded');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

updateWordOWindow();