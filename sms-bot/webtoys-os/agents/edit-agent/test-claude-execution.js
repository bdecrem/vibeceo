#!/usr/bin/env node

// Test what happens when Claude tries to execute commands
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function testClaude() {
    // Create a prompt that asks Claude to run a command
    const prompt = `
You are in the directory: /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os

Please check if the safe-deploy-app.js script exists and is working by running:
ls -la scripts/safe-deploy-app.js

Then show the current directory with:
pwd

Just run these commands and show the output.
`;
    
    const tempFile = `/tmp/test-claude-${Date.now()}.txt`;
    fs.writeFileSync(tempFile, prompt);
    
    console.log('🧪 Testing Claude with command execution request...\n');
    
    const command = `cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os && cat "${tempFile}" | /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions`;
    
    try {
        const result = await execAsync(command, {
            timeout: 30000, // 30 seconds
            maxBuffer: 1024 * 1024 * 50
        });
        
        console.log('✅ Claude responded:');
        console.log(result.stdout);
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.stdout) {
            console.log('\nPartial output:');
            console.log(error.stdout.substring(0, 500));
        }
    }
    
    // Clean up
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
}

testClaude();