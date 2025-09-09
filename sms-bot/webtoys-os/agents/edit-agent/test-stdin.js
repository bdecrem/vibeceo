#!/usr/bin/env node

import { spawn } from 'child_process';

async function testStdin() {
    const prompt = "Create a simple color picker app";
    
    console.log('Testing direct stdin write...');
    
    const child = spawn('/Users/bartdecrem/.local/bin/claude', 
        ['--print', '--verbose', '--dangerously-skip-permissions'], 
        {
            cwd: '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                HOME: '/Users/bartdecrem',
                USER: 'bartdecrem',
                SHELL: '/bin/bash'
            }
        }
    );
    
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
    });
    
    // Write prompt to stdin and close
    child.stdin.write(prompt);
    child.stdin.end();
}

testStdin();