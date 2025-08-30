#!/usr/bin/env node
import { readFileSync } from 'fs';
import { safeUpdateDesktop } from './safe-wrapper.js';

async function deployModernDesktop() {
    try {
        // Read the new modern desktop HTML
        const modernHtml = readFileSync('core/desktop-v3-modern-new.html', 'utf-8');
        
        console.log('🚀 Deploying Modern Playground theme to WebtoysOS...');
        
        // Deploy using safe wrapper (creates backup automatically)
        const result = await safeUpdateDesktop(
            modernHtml, 
            'Modern Playground theme with glassmorphic UI, score system, and beautiful icons'
        );
        
        if (result === true) {
            console.log('✅ Modern desktop deployed successfully!');
            console.log(`🌐 View at: https://webtoys.ai/public/toybox-os-v3-test`);
        } else {
            console.error('❌ Deployment failed:', result);
        }
    } catch (error) {
        console.error('❌ Error deploying modern desktop:', error);
        process.exit(1);
    }
}

deployModernDesktop();