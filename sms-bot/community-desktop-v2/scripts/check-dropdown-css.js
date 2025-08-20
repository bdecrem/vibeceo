#!/usr/bin/env node

import { fetchCurrentThemeCSS } from './safe-css-wrapper.js';

async function checkDropdownCSS() {
    try {
        console.log('🔍 Checking for dropdown menu CSS...');
        
        const current = await fetchCurrentThemeCSS();
        const css = current.css_content;
        
        if (css.includes('dropdown-menu')) {
            console.log('✅ Dropdown menu CSS found in theme');
            
            // Extract dropdown-related CSS
            const lines = css.split('\n');
            let inDropdownSection = false;
            let dropdownLines = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('dropdown-menu') || line.includes('menu-item')) {
                    inDropdownSection = true;
                    dropdownLines.push(`${i+1}: ${line}`);
                } else if (inDropdownSection) {
                    if (line.trim() === '}' && !line.includes('{')) {
                        dropdownLines.push(`${i+1}: ${line}`);
                        inDropdownSection = false;
                    } else {
                        dropdownLines.push(`${i+1}: ${line}`);
                    }
                }
            }
            
            console.log('📄 Dropdown CSS found:');
            dropdownLines.forEach(line => console.log(line));
            
        } else {
            console.log('❌ No dropdown menu CSS found in theme!');
            console.log('🔧 The CSS may need to be re-added to the theme');
        }
        
    } catch (error) {
        console.error('❌ Error checking dropdown CSS:', error);
        process.exit(1);
    }
}

// Run the script
checkDropdownCSS();