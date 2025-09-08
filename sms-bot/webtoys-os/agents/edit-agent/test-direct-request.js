#!/usr/bin/env node

/**
 * Direct test of edit agent - bypasses issue tracker completely
 * Usage: node test-direct-request.js "Your request here"
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLAUDE_PATH = '/Users/bartdecrem/.local/bin/claude';
const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os';

async function testDirectRequest(request) {
    if (!request) {
        console.log('❌ Please provide a request as an argument');
        console.log('Usage: node test-direct-request.js "Create a calculator app"');
        return;
    }
    
    console.log('📋 Testing with request:', request);
    console.log('---\n');
    
    // Test 1: Simple direct execution
    console.log('🧪 Test 1: Direct execution without any flags');
    const tempFile1 = `/tmp/test-direct-1-${Date.now()}.txt`;
    fs.writeFileSync(tempFile1, request);
    
    try {
        const result = await execAsync(
            `cat "${tempFile1}" | ${CLAUDE_PATH}`,
            {
                timeout: 30000,
                maxBuffer: 1024 * 1024 * 50,
                cwd: PROJECT_ROOT
            }
        );
        console.log('✅ SUCCESS! Output preview:');
        console.log(result.stdout.substring(0, 500));
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.stdout) console.log('Output:', error.stdout.substring(0, 200));
    }
    fs.unlinkSync(tempFile1);
    
    console.log('\n---\n');
    
    // Test 2: With --dangerously-skip-permissions only
    console.log('🧪 Test 2: With --dangerously-skip-permissions flag');
    const tempFile2 = `/tmp/test-direct-2-${Date.now()}.txt`;
    fs.writeFileSync(tempFile2, request);
    
    try {
        const result = await execAsync(
            `cd ${PROJECT_ROOT} && cat "${tempFile2}" | ${CLAUDE_PATH} --dangerously-skip-permissions`,
            {
                timeout: 30000,
                maxBuffer: 1024 * 1024 * 50,
                shell: '/bin/bash'
            }
        );
        console.log('✅ SUCCESS! Output preview:');
        console.log(result.stdout.substring(0, 500));
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.stdout) console.log('Output:', error.stdout.substring(0, 200));
    }
    fs.unlinkSync(tempFile2);
    
    console.log('\n---\n');
    
    // Test 3: With full agent-style prompt
    console.log('🧪 Test 3: With agent-style prompt (includes context)');
    
    const agentPrompt = `${request}

---
Create the app in the apps/ directory, then deploy with: node scripts/auto-deploy-app.js apps/[filename].html

You're in: ${PROJECT_ROOT}`;
    
    const tempFile3 = `/tmp/test-direct-3-${Date.now()}.txt`;
    fs.writeFileSync(tempFile3, agentPrompt);
    
    console.log('Prompt size:', agentPrompt.length, 'characters');
    
    try {
        const result = await execAsync(
            `cd ${PROJECT_ROOT} && cat "${tempFile3}" | ${CLAUDE_PATH} --dangerously-skip-permissions`,
            {
                timeout: 30000,
                maxBuffer: 1024 * 1024 * 50,
                shell: '/bin/bash',
                env: { ...process.env }
            }
        );
        console.log('✅ SUCCESS! Output preview:');
        console.log(result.stdout.substring(0, 500));
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.stdout) console.log('Output:', error.stdout.substring(0, 200));
    }
    fs.unlinkSync(tempFile3);
}

// Get request from command line
const request = process.argv.slice(2).join(' ') || 'Create a simple calculator app called calc';

testDirectRequest(request);