#!/usr/bin/env node

import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables EXACTLY like the agent
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os';
const CLAUDE_PATH = '/Users/bartdecrem/.local/bin/claude';

async function test() {
    const prompt = "Create a simple dice rolling app";
    const tempFile = `/tmp/test-exact-${Date.now()}.txt`;
    
    fs.writeFileSync(tempFile, prompt);
    
    console.log('Testing with EXACT agent setup...');
    console.log('Environment vars loaded from dotenv');
    
    // EXACTLY like agent's spawn code
    return new Promise((resolve) => {
        const command = `cd ${PROJECT_ROOT} && ${CLAUDE_PATH} --print --verbose --dangerously-skip-permissions < "${tempFile}"`;
        
        const child = spawn('/bin/bash', ['-c', command], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 600000
        });
        
        let output = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
            process.stdout.write('.');
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            fs.unlinkSync(tempFile);
            console.log(`\nExit code: ${code}`);
            if (code === 0) {
                console.log('✅ SUCCESS! Output length:', output.length);
            } else {
                console.log('❌ FAILED! Error:', stderr.substring(0, 200));
            }
            resolve();
        });
    });
}

test();