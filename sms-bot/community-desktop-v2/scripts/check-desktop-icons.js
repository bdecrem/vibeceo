#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkDesktop() {
    const { data } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-os')
        .single();
    
    const html = data.html_content;
    
    // Check registered apps
    console.log('📱 Registered windowed apps:');
    const appsMatch = html.match(/window\.windowedApps = \{([^}]+)\}/s);
    if (appsMatch) {
        const apps = appsMatch[1].match(/'([^']+)':/g);
        if (apps) {
            apps.forEach(app => {
                const id = app.replace(/[':]/g, '');
                console.log(`  - ${id}`);
                
                // Check if has desktop icon
                if (html.includes(`openWindowedApp('${id}')`)) {
                    console.log(`    ✅ Has desktop icon`);
                } else {
                    console.log(`    ❌ NO desktop icon`);
                }
            });
        }
    }
    
    // Specifically check for paint app
    console.log('\n🎨 Paint app status:');
    if (html.includes("'toybox-wave-wood-deconstructing':")) {
        console.log('  ✅ Registered in windowedApps');
    } else {
        console.log('  ❌ NOT registered in windowedApps');
    }
    
    if (html.includes("openWindowedApp('toybox-wave-wood-deconstructing')")) {
        console.log('  ✅ Has desktop icon');
    } else {
        console.log('  ❌ NO desktop icon - needs to be added');
    }
}

checkDesktop();