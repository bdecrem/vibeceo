#!/usr/bin/env node

// Direct test of Claude execution without issue tracker
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function testClaudeDirect() {
    // Simple test prompt
    const prompt = "Create a simple text editor app called Moi with basic save/load functionality";
    
    // Write to temp file
    const tempFile = `/tmp/test-direct-${Date.now()}.txt`;
    fs.writeFileSync(tempFile, prompt);
    
    console.log('📝 Testing Claude with prompt:', prompt);
    console.log('📂 Temp file:', tempFile);
    
    // Build the exact command the agent uses
    const command = `cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os && cat "${tempFile}" | /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions`;
    
    console.log('🚀 Executing command:', command);
    console.log('⏳ Processing...\n');
    
    try {
        const result = await execAsync(command, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 50
        });
        
        console.log('✅ SUCCESS! Output:');
        console.log(result.stdout);
        
        // Clean up
        fs.unlinkSync(tempFile);
    } catch (error) {
        console.log('❌ FAILED with error:');
        console.log('Exit code:', error.code);
        console.log('Stdout:', error.stdout);
        console.log('Stderr:', error.stderr);
        console.log('Message:', error.message);
        
        // Clean up
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

testClaudeDirect();