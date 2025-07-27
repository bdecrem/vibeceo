#!/usr/bin/env node

/**
 * Test script for --music command
 * Simulates SMS flow for music app generation
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFile, mkdir } from 'fs/promises';
import { processWTAFRequest } from '../dist/engine/controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configurations
const testCases = [
    {
        name: "Simple Music Generator",
        prompt: "wtaf --music make me a simple music generator where I type a prompt and get a song",
        userSlug: "test-user",
        senderPhone: "+1234567890"
    },
    {
        name: "Beat Machine",
        prompt: "wtaf --music make me a beats machine where i can type in BPM, then start by creating a drum beat, then add bass, then a melody line",
        userSlug: "test-user",
        senderPhone: "+1234567890"
    },
    {
        name: "Mood Radio",
        prompt: "wtaf --music create a mood radio where I click buttons for different moods and it generates matching music",
        userSlug: "test-user",
        senderPhone: "+1234567890"
    }
];

async function runTest(testCase) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎵 Testing: ${testCase.name}`);
    console.log(`📝 Prompt: ${testCase.prompt}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
        // Create incoming directory for the test
        const incomingDir = join(__dirname, '..', 'INCOMING');
        await mkdir(incomingDir, { recursive: true });
        
        // Create test file
        const timestamp = new Date().toISOString().replace(/[:]/g, '-');
        const filename = `music-test-${timestamp}.txt`;
        const filepath = join(incomingDir, filename);
        
        const fileContent = [
            `SENDER:${testCase.senderPhone}`,
            `USER_SLUG:${testCase.userSlug}`,
            `ORIGINAL_REQUEST:${testCase.prompt}`,
            '',
            testCase.prompt
        ].join('\n');
        
        await writeFile(filepath, fileContent, 'utf8');
        console.log(`📁 Created test file: ${filename}`);
        
        // Process the request
        console.log(`\n🚀 Processing request...`);
        const result = await processWTAFRequest(
            testCase.prompt,
            testCase.userSlug,
            testCase.senderPhone,
            filename
        );
        
        if (result) {
            console.log(`\n✅ Success! Music app generated`);
            console.log(`Check the OUTGOING directory for the generated HTML`);
        } else {
            console.log(`\n❌ Failed to generate music app`);
        }
        
    } catch (error) {
        console.error(`\n❌ Error:`, error.message);
        console.error(error.stack);
    }
}

async function main() {
    console.log(`🎵 WEBTOYS Music Command Test Suite`);
    console.log(`Testing --music command integration...\n`);
    
    // Run a specific test or all tests
    const testIndex = process.argv[2] ? parseInt(process.argv[2]) - 1 : 0;
    
    if (testIndex >= 0 && testIndex < testCases.length) {
        await runTest(testCases[testIndex]);
    } else {
        console.log(`Running all ${testCases.length} test cases...\n`);
        for (const testCase of testCases) {
            await runTest(testCase);
        }
    }
    
    console.log(`\n🎵 Test complete!`);
}

// Run the test
main().catch(console.error);