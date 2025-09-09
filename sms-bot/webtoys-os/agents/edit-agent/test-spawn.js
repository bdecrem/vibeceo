#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';

async function testSpawn() {
    const prompt = "Create a simple timer app that counts seconds";
    const tempFile = `/tmp/test-spawn-${Date.now()}.txt`;
    
    fs.writeFileSync(tempFile, prompt);
    
    console.log('Testing spawn() with shell: true...');
    
    const child = spawn('/bin/bash', ['-c', 
        `cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os && /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions < "${tempFile}"`
    ], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write('.');
    });
    
    child.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    child.on('close', (code) => {
        console.log(`\nExit code: ${code}`);
        if (code === 0) {
            console.log('✅ SUCCESS! Output length:', output.length);
            console.log('First 200 chars:', output.substring(0, 200));
        } else {
            console.log('❌ FAILED! Error:', error.substring(0, 200));
        }
        fs.unlinkSync(tempFile);
    });
}

testSpawn();