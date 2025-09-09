#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function test() {
    const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os';
    const CLAUDE_PATH = '/Users/bartdecrem/.local/bin/claude';
    
    // Create exact prompt like agent
    const prompt = 'Create a simple text editor app called Test';
    const tempFile = path.join('/tmp', `test-exact-${Date.now()}.txt`);
    await fs.promises.writeFile(tempFile, prompt);
    
    // Exact command from agent
    const command = `cd ${PROJECT_ROOT} && cat "${tempFile}" | ${CLAUDE_PATH} --print --verbose --dangerously-skip-permissions`;
    
    console.log('Running exact agent command...');
    console.log('Command:', command);
    
    const startTime = Date.now();
    
    try {
        const result = await execAsync(command, {
            timeout: 600000, // 10 minutes like agent
            maxBuffer: 1024 * 1024 * 50, // 50MB buffer
            env: { 
                ...process.env,
                HOME: process.env.HOME || '/Users/bartdecrem',
                USER: process.env.USER || 'bartdecrem',
                PATH: process.env.PATH || '/Users/bartdecrem/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
                CLAUDECODE: '1',
                CLAUDE_CODE_ENTRYPOINT: 'cli'
            },
            shell: '/bin/bash'
        });
        
        console.log('✅ Success after', Math.round((Date.now() - startTime) / 1000), 'seconds');
        console.log('Output:', result.stdout.substring(0, 200));
        
    } catch (error) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log('❌ Failed after', duration, 'seconds');
        console.log('Error message:', error.message);
        console.log('Exit code:', error.code);
        console.log('Signal:', error.signal);
        console.log('Stdout:', error.stdout || '(empty)');
        console.log('Stderr:', error.stderr || '(empty)');
    }
    
    // Clean up
    await fs.promises.unlink(tempFile);
}

test();
