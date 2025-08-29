#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function addTEXTY() {
    console.log('Adding TEXTY to desktop...');
    
    const desktop = await fetchCurrentToyBoxOS();
    let html = desktop.html_content;
    
    // Remove any existing TEXTY
    html = html.replace(/<div class="desktop-icon"[^>]*>[\s\S]*?TEXTY[\s\S]*?<\/div>\s*<\/div>/g, '');
    
    // Find BDwords and add TEXTY after it
    const bdwordsEnd = html.indexOf('>BDwords</div>');
    if (bdwordsEnd > 0) {
        // Find the closing of the BDwords icon container
        let pos = html.indexOf('</div>', bdwordsEnd + 14) + 6;
        
        const textyIcon = `
        <div class="desktop-icon" style="left: 610px; top: 80px">
            <div class="icon">📄</div>
            <div class="label">TEXTY</div>
        </div>`;
        
        html = html.substring(0, pos) + textyIcon + html.substring(pos);
        
        await safeUpdateToyBoxOS(html, 'Added TEXTY icon to desktop');
        console.log('✅ TEXTY added successfully!');
        console.log('🔄 Refresh https://webtoys.ai/public/webtoys-os-v2');
    } else {
        console.error('Could not find BDwords');
    }
}

setTimeout(addTEXTY, 100);