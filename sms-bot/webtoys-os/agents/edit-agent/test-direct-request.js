#!/usr/bin/env node

// Test EXACTLY what the agent sees
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function testDirect() {
    console.log('Testing direct Claude execution to see actual output...\n');
    
    // Create a simple prompt file
    const prompt = 'Create a simple hello world app';
    const tempFile = '/tmp/test-direct.txt';
    fs.writeFileSync(tempFile, prompt);
    
    // Test 1: Without any flags
    console.log('Test 1: Basic Claude call');
    const cmd1 = `cat ${tempFile} | /Users/bartdecrem/.local/bin/claude`;
    
    try {
        const result = await execAsync(cmd1, { timeout: 5000 });
        console.log('✅ Success:', result.stdout.substring(0, 100));
    } catch (e) {
        console.log('❌ Failed');
        console.log('Exit code:', e.code);
        console.log('Signal:', e.signal);
        console.log('Stdout:', e.stdout || '(empty)');
        console.log('Stderr:', e.stderr || '(empty)');
    }
    
    // Test 2: With --dangerously-skip-permissions
    console.log('\n\nTest 2: With --dangerously-skip-permissions');
    const cmd2 = `cat ${tempFile} | /Users/bartdecrem/.local/bin/claude --dangerously-skip-permissions`;
    
    try {
        const result = await execAsync(cmd2, { timeout: 5000 });
        console.log('✅ Success:', result.stdout.substring(0, 100));
    } catch (e) {
        console.log('❌ Failed');
        console.log('Exit code:', e.code);
        console.log('Signal:', e.signal);
        console.log('Stdout:', e.stdout || '(empty)');
        console.log('Stderr:', e.stderr || '(empty)');
    }
    
    // Test 3: With all flags like agent
    console.log('\n\nTest 3: With --print --verbose --dangerously-skip-permissions');
    const cmd3 = `cat ${tempFile} | /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions`;
    
    try {
        const result = await execAsync(cmd3, { timeout: 5000 });
        console.log('✅ Success:', result.stdout.substring(0, 100));
    } catch (e) {
        console.log('❌ Failed');
        console.log('Exit code:', e.code);
        console.log('Signal:', e.signal);
        console.log('Stdout:', e.stdout || '(empty)');
        console.log('Stderr:', e.stderr || '(empty)');
    }
    
    // Clean up
    fs.unlinkSync(tempFile);
}

testDirect();
