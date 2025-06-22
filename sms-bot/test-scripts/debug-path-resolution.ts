#!/usr/bin/env node

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 PATH RESOLUTION DEBUG');
console.log('========================');
console.log(`__filename: ${__filename}`);
console.log(`__dirname: ${__dirname}`);

// Test the same logic as wtaf-processor.ts
const testPath = join(__dirname, '..', '..', 'content', 'builder-zad-implementer.json');
console.log(`Resolved path: ${testPath}`);
console.log(`File exists: ${existsSync(testPath)}`);

if (existsSync(testPath)) {
    try {
        const content = readFileSync(testPath, 'utf8');
        console.log(`File size: ${content.length} bytes`);
        console.log(`First 100 chars: ${content.slice(0, 100)}`);
    } catch (error) {
        console.error(`Error reading file: ${error}`);
    }
} else {
    console.log('❌ File does not exist at resolved path');
    
    // Check alternative paths
    const alt1 = join(__dirname, '..', 'content', 'builder-zad-implementer.json');
    const alt2 = join(__dirname, 'content', 'builder-zad-implementer.json');
    
    console.log(`Alternative 1: ${alt1} - exists: ${existsSync(alt1)}`);
    console.log(`Alternative 2: ${alt2} - exists: ${existsSync(alt2)}`);
}

// Test the ACTUAL path used when running from dist
console.log('\n🎯 COMPILED CODE PATH TEST');
console.log('===========================');

// Simulate running from dist/test-scripts/
const distPath = join(__dirname, '..', '..', 'content', 'builder-zad-implementer.json');
console.log(`Dist simulation path: ${distPath}`);
console.log(`Dist simulation exists: ${existsSync(distPath)}`); 