#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTextEditorStatus() {
    const { data } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'webtoys-os-v2')
        .single();
        
    if (!data) {
        console.log('❌ Could not find webtoys-os-v2');
        return;
    }
    
    console.log('🔍 Checking text editor status in WebtoysOS v2...\n');
    
    // Check windowedApps registry
    const windowedAppsPattern = /window\.windowedApps\s*=\s*{([^}]*)}/;
    const match = data.html_content.match(windowedAppsPattern);
    
    if (match) {
        console.log('📱 WindowedApps registry found:');
        const appsContent = match[1];
        
        if (appsContent.includes('toybox-text-editor')) {
            console.log('✅ toybox-text-editor found in registry');
        } else {
            console.log('❌ toybox-text-editor NOT found in registry');
        }
        
        if (appsContent.includes('texty')) {
            console.log('✅ texty found in registry');
        } else {
            console.log('❌ texty NOT found in registry');
        }
    }
    
    // Check for desktop icons
    console.log('\n🖼️ Desktop icons:');
    const iconPattern = /<div[^>]*class="desktop-icon"[^>]*onclick="openWindowedApp\('([^']+)'\)"[^>]*>[\s\S]*?<div[^>]*class="label"[^>]*>([^<]+)<\/div>/g;
    let iconMatch;
    let textEditorIconFound = false;
    
    while ((iconMatch = iconPattern.exec(data.html_content)) !== null) {
        const appId = iconMatch[1];
        const label = iconMatch[2];
        console.log(`  - ${appId}: "${label}"`);
        
        if (appId.includes('text') || label.toLowerCase().includes('text')) {
            textEditorIconFound = true;
        }
    }
    
    if (textEditorIconFound) {
        console.log('✅ Text editor icon found on desktop');
    } else {
        console.log('❌ No text editor icon found on desktop');
    }
    
    // Check for simple text icons (non-windowed)
    const simpleIconPattern = /<div[^>]*class="desktop-icon"[^>]*onclick="[^"]*"[^>]*>[\s\S]*?<div[^>]*class="label"[^>]*>([^<]*[Tt]ext[^<]*)<\/div>/g;
    let simpleMatch;
    
    console.log('\n📝 Simple text-related icons:');
    while ((simpleMatch = simpleIconPattern.exec(data.html_content)) !== null) {
        console.log(`  - "${simpleMatch[1]}"`);
    }
}

checkTextEditorStatus();