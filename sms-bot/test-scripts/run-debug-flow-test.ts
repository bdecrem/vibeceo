#!/usr/bin/env node

/**
 * Test runner for the complete flow debugger
 * 
 * This shows how to use the debug-complete-flow script with different examples
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runDebugTest(userInput: string) {
    console.log(`\n🧪 Testing complete flow for: "${userInput}"`);
    console.log("=" + "=".repeat(80));
    
    const scriptPath = join(__dirname, 'debug-complete-flow.js');
    
    return new Promise<void>((resolve, reject) => {
        const process = spawn('node', [scriptPath, userInput], {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Test completed successfully for: "${userInput}"`);
                resolve();
            } else {
                console.log(`❌ Test failed with code ${code} for: "${userInput}"`);
                reject(new Error(`Process exited with code ${code}`));
            }
        });
        
        process.on('error', reject);
    });
}

async function runAllTests() {
    console.log("🚀 Running Complete Flow Debug Tests");
    console.log("=" + "=".repeat(80));
    
    const testCases = [
        "build a chat page for me and my friend",
        "build a landing page with email signup",
        "create a game where I can collect points",
        "make me a to-do list app"
    ];
    
    for (const testCase of testCases) {
        try {
            await runDebugTest(testCase);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between tests
        } catch (error) {
            console.error(`❌ Test failed: ${error}`);
        }
    }
    
    console.log("\n🎉 All tests completed!");
    console.log("📁 Check the logs/ directory for detailed output files");
}

// Run tests
runAllTests().catch(console.error); 