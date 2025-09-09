#!/usr/bin/env node

/**
 * Test script to verify the authentication fix
 * Run this after updating the cron environment or refreshing tokens
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);
const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os';
const CLAUDE_PATH = '/Users/bartdecrem/.local/bin/claude';

async function testAuthenticationFix() {
    console.log('🧪 Testing authentication fix...');
    
    // Test 1: Simple command with cron-like environment
    console.log('\n📋 Test 1: Simple Claude call with cron environment...');
    try {
        const result1 = await execAsync(`echo "What is 2+2?" | ${CLAUDE_PATH} --dangerously-skip-permissions`, {
            timeout: 10000,
            env: {
                HOME: '/Users/bartdecrem',  // This should fix the auth issue
                PATH: '/Users/bartdecrem/.local/bin:/usr/local/bin:/usr/bin:/bin'
            }
        });
        console.log('✅ Test 1 passed:', result1.stdout.trim());
    } catch (e) {
        console.log('❌ Test 1 failed:', e.message);
        console.log('stdout:', e.stdout || 'none');
        console.log('stderr:', e.stderr || 'none');
        if (e.stdout?.includes('Credit balance is too low')) {
            console.log('🔥 Still getting credit balance error - tokens need refresh');
        }
    }
    
    // Test 2: Complex prompt like the agent uses
    console.log('\n📋 Test 2: Complex prompt with agent environment...');
    
    const complexPrompt = 'Create a simple hello world app for testing.';
    const tempFile = `/tmp/auth-test-${Date.now()}.txt`;
    fs.writeFileSync(tempFile, complexPrompt);
    
    try {
        const command = `cd ${PROJECT_ROOT} && cat "${tempFile}" | ${CLAUDE_PATH} --print --verbose --dangerously-skip-permissions`;
        const result2 = await execAsync(command, {
            timeout: 30000,
            env: {
                HOME: '/Users/bartdecrem',
                USER: 'bartdecrem',
                PATH: '/Users/bartdecrem/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
                CLAUDECODE: '1',
                CLAUDE_CODE_ENTRYPOINT: 'cli'
            }
        });
        
        console.log('✅ Test 2 passed - duration:', Math.round((Date.now() - Date.now()) / 1000), 'seconds');
        console.log('📄 Response length:', result2.stdout.length);
        console.log('📄 First 100 chars:', result2.stdout.substring(0, 100));
        
    } catch (e) {
        console.log('❌ Test 2 failed:', e.message);
        console.log('stdout:', e.stdout || 'none');
        console.log('stderr:', e.stderr || 'none');
        if (e.stdout?.includes('Credit balance is too low')) {
            console.log('🔥 AUTHENTICATION ISSUE PERSISTS');
            console.log('💡 Next steps:');
            console.log('   1. Run: /Users/bartdecrem/.local/bin/claude setup-token');
            console.log('   2. Follow the interactive prompts to refresh tokens');
        }
    }
    
    // Clean up
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    
    console.log('\n🎯 Authentication test complete');
}

testAuthenticationFix();