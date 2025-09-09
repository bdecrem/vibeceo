#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function testLoginShell() {
    const prompt = "Create a simple counter app with increment and decrement buttons";
    const tempFile = `/tmp/test-login-${Date.now()}.txt`;
    
    fs.writeFileSync(tempFile, prompt);
    
    console.log('Testing exec with login shell...');
    
    const command = `cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os && /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions < "${tempFile}"`;
    
    try {
        const result = await execAsync(`/bin/bash -l -c '${command}'`, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 50
        });
        
        console.log('✅ SUCCESS! Output length:', result.stdout.length);
        console.log('First 200 chars:', result.stdout.substring(0, 200));
        
    } catch (error) {
        console.log('❌ FAILED! Error:', error.message);
        if (error.stderr) {
            console.log('Stderr:', error.stderr.substring(0, 200));
        }
    }
    
    fs.unlinkSync(tempFile);
}

testLoginShell();