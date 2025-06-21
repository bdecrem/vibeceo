/**
 * TEST: Zero Admin Data Classifier Detection
 * 
 * This tests that our classifier can correctly identify "text-based social apps for up to 5 people"
 * and distinguish them from simple email displays and data collection with admin needs.
 * 
 * MICROSERVICE: Test validation for the Restaurant's Cookbook updates
 */

import { OpenAI } from 'openai';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { OPENAI_API_KEY } from '../engine/shared/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Load classifier prompt from cookbook
 */
async function loadClassifierPrompt() {
    try {
        // When compiled, this runs from dist/test-scripts/, so we need to go up 2 levels to reach sms-bot/
        const promptPath = join(__dirname, '..', '..', 'content', 'classifier.json');
        const content = await readFile(promptPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to load classifier: ${error}`);
    }
}

/**
 * Test classifier with a specific prompt
 */
async function testClassifier(userInput: string): Promise<any> {
    const classifierPrompt = await loadClassifierPrompt();
    
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            classifierPrompt,
            { role: "user", content: userInput }
        ],
        temperature: 0.1,
        max_tokens: 500
    });
    
    return response.choices[0].message.content;
}

/**
 * Parse metadata from classifier response
 */
function parseMetadata(response: string): Record<string, any> {
    const metadataMatch = response.match(/---WTAF_METADATA---([\s\S]*?)---END_METADATA---/);
    if (!metadataMatch) {
        throw new Error('No metadata found in response');
    }
    
    const metadata: Record<string, any> = {};
    const lines = metadataMatch[1].trim().split('\n');
    
    for (const line of lines) {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
            if (value === 'true') {
                metadata[key] = true;
            } else if (value === 'false') {
                metadata[key] = false;
            } else {
                metadata[key] = value;
            }
        }
    }
    
    return metadata;
}

/**
 * Main test suite
 */
async function runTests() {
    console.log("🧪 TESTING ZERO ADMIN DATA CLASSIFIER");
    console.log("=" + "=".repeat(50));
    
    const testCases = [
        {
            name: "PRIMARY TARGET: Friends idea sharing",
            input: "build a place where me and my friends can share ideas",
            expected: { APP_TYPE: "zero_admin_data", ZERO_ADMIN_DATA: true }
        },
        {
            name: "Zero Admin: Study group discussion",
            input: "make a discussion board for my study group",
            expected: { APP_TYPE: "zero_admin_data", ZERO_ADMIN_DATA: true }
        },
        {
            name: "Zero Admin: Team brainstorm",
            input: "create an idea dump for my startup team", 
            expected: { APP_TYPE: "zero_admin_data", ZERO_ADMIN_DATA: true }
        },
        {
            name: "Simple Email: Business card",
            input: "build me a business card",
            expected: { APP_TYPE: "simple_email", EMAIL_NEEDED: true }
        },
        {
            name: "Data Collection: Newsletter signup",
            input: "build me a newsletter signup",
            expected: { APP_TYPE: "data_collection", EMAIL_NEEDED: false }
        },
        {
            name: "Data Collection: Contact form",
            input: "create a contact form",
            expected: { APP_TYPE: "data_collection", EMAIL_NEEDED: false }
        }
    ];
    
    let passCount = 0;
    
    for (const testCase of testCases) {
        console.log(`\n🔍 Testing: ${testCase.name}`);
        console.log(`📥 Input: "${testCase.input}"`);
        
        try {
            const response = await testClassifier(testCase.input);
            console.log(`📤 Raw response length: ${response?.length || 0} chars`);
            
            const metadata = parseMetadata(response!);
            console.log(`📊 Parsed metadata:`, metadata);
            
            // Check if all expected values match
            let passed = true;
            for (const [key, expectedValue] of Object.entries(testCase.expected)) {
                if (metadata[key] !== expectedValue) {
                    console.log(`❌ FAIL: Expected ${key}=${expectedValue}, got ${metadata[key]}`);
                    passed = false;
                } else {
                    console.log(`✅ PASS: ${key}=${expectedValue}`);
                }
            }
            
            if (passed) {
                console.log(`🎉 TEST PASSED: ${testCase.name}`);
                passCount++;
            } else {
                console.log(`💥 TEST FAILED: ${testCase.name}`);
            }
            
        } catch (error) {
            console.log(`💥 TEST ERROR: ${testCase.name} - ${error}`);
        }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log(`🏆 RESULTS: ${passCount}/${testCases.length} tests passed`);
    
    if (passCount === testCases.length) {
        console.log("🚀 ALL TESTS PASSED! Classifier correctly identifies Zero Admin Data apps!");
    } else {
        console.log("⚠️  Some tests failed. Classifier needs refinement.");
    }
}

// Run the tests
runTests().catch(console.error); 