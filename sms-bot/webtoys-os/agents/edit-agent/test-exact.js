#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os';
const CLAUDE_PATH = '/Users/bartdecrem/.local/bin/claude';

async function test() {
    // Simulate exact prompt the agent builds
    const description = 'Create a simple text editor app called Moi with basic text editing capabilities.';
    
    let prompt = description;
    prompt += `

---
CRITICAL: This app REQUIRES authentication! Copy this EXACT code:

// Global auth state
let currentUser = null;

// Load auth from localStorage (immediate)
function loadAuthFromStorage() {
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

You're in: ${PROJECT_ROOT}`;

    console.log('Prompt length:', prompt.length);
    
    // Write to temp file exactly like agent does
    const tempFile = path.join('/tmp', `test-exact-${Date.now()}.txt`);
    await fs.promises.writeFile(tempFile, prompt);
    
    // Build command exactly like agent does
    const command = `cd ${PROJECT_ROOT} && cat "${tempFile}" | ${CLAUDE_PATH} --dangerously-skip-permissions`;
    
    console.log('Command:', command);
    console.log('Executing...');
    
    try {
        const result = await execAsync(command, {
            timeout: 30000,
            maxBuffer: 1024 * 1024 * 50,
            env: { 
                ...process.env,
                HOME: process.env.HOME || '/Users/bartdecrem',
                USER: process.env.USER || 'bartdecrem',
                PATH: process.env.PATH || '/Users/bartdecrem/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'
            },
            shell: '/bin/bash'
        });
        
        console.log('✅ Success!');
        console.log('Output length:', result.stdout.length);
        console.log('First 500 chars:', result.stdout.substring(0, 500));
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('stdout:', error.stdout || 'none');
        console.log('stderr:', error.stderr || 'none');
    }
    
    // Clean up
    await fs.promises.unlink(tempFile);
}

test();
