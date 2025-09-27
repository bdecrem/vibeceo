#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function test() {
    console.log('Test 1: Simple command without exec');
    const test1 = 'echo "What is 2+2?" | /Users/bartdecrem/.local/bin/claude --dangerously-skip-permissions';
    
    try {
        const r1 = await execAsync(test1, { timeout: 10000 });
        console.log('✅ Test 1 passed:', r1.stdout.trim());
    } catch (e) {
        console.log('❌ Test 1 failed:', e.message);
    }
    
    console.log('\nTest 2: With cd command');
    const test2 = 'cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os && echo "What is 2+2?" | /Users/bartdecrem/.local/bin/claude --dangerously-skip-permissions';
    
    try {
        const r2 = await execAsync(test2, { timeout: 10000 });
        console.log('✅ Test 2 passed:', r2.stdout.trim());
    } catch (e) {
        console.log('❌ Test 2 failed:', e.message);
        console.log('stdout:', e.stdout);
        console.log('stderr:', e.stderr);
    }
    
    console.log('\nTest 3: With cd and env');
    const test3 = 'cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os && echo "What is 2+2?" | /Users/bartdecrem/.local/bin/claude --dangerously-skip-permissions';
    
    try {
        const r3 = await execAsync(test3, { 
            timeout: 10000,
            env: { ...process.env, HOME: '/Users/bartdecrem' }
        });
        console.log('✅ Test 3 passed:', r3.stdout.trim());
    } catch (e) {
        console.log('❌ Test 3 failed:', e.message);
    }
}

test();
