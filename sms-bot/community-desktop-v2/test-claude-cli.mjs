#!/usr/bin/env node

// Quick test to see if Claude CLI works
import { exec } from 'child_process';

console.log('Testing Claude CLI...');

const testPrompt = 'Say "hello" and nothing else';
const claudePath = '/Users/bartdecrem/.local/bin/claude';

// Test 1: Simple echo test with timeout
const child = exec(`echo "${testPrompt}" | ${claudePath}`, { timeout: 5000 }, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    if (error.killed) {
      console.error('Claude CLI timed out after 5 seconds - it appears to be hanging');
    }
  } else {
    console.log('Success! Output:', stdout);
  }
  
  if (stderr) {
    console.error('Stderr:', stderr);
  }
  
  process.exit(0);
});

console.log('Waiting for response (5 second timeout)...');