#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from sms-bot/.env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found');
    console.log(`Expected location: ${envPath}`);
    console.log('Please create sms-bot/.env.local with your ANTHROPIC_API_KEY');
    process.exit(1);
}
dotenv.config({ path: envPath });

// Simple Claude API client
async function callClaude(systemPrompt, userPrompt, stepName) {
    console.log('\n' + '='.repeat(80));
    console.log(`🚀 STEP ${stepName}: SENDING TO CLAUDE API`);
    console.log('='.repeat(80));
    
    console.log('\n📋 SYSTEM PROMPT (RAW):');
    console.log('-'.repeat(40));
    console.log(systemPrompt);
    console.log('-'.repeat(40));
    
    console.log('\n👤 USER PROMPT (RAW):');
    console.log('-'.repeat(40));
    console.log(userPrompt);
    console.log('-'.repeat(40));
    
    const requestBody = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: userPrompt
            }
        ]
    };
    
    console.log('\n🔧 API REQUEST BODY (RAW):');
    console.log('-'.repeat(40));
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('-'.repeat(40));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.log('\n❌ API ERROR RESPONSE (RAW):');
        console.log('-'.repeat(40));
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('Body:', errorText);
        console.log('-'.repeat(40));
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    console.log('\n🤖 CLAUDE RESPONSE (RAW):');
    console.log('-'.repeat(40));
    console.log(responseText);
    console.log('-'.repeat(40));
    
    console.log('\n📊 RESPONSE METADATA:');
    console.log('-'.repeat(40));
    console.log('Model:', data.model || 'unknown');
    console.log('Usage:', JSON.stringify(data.usage || {}, null, 2));
    console.log('Stop reason:', data.stop_reason || 'unknown');
    console.log('-'.repeat(40));
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ STEP ${stepName} COMPLETE`);
    console.log('='.repeat(80));
    
    return responseText;
}

// Extract HTML from Claude response
function extractHtml(response) {
    const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/);
    if (htmlMatch) {
        return htmlMatch[1];
    }
    
    // If no code blocks, check if the entire response looks like HTML
    if (response.trim().startsWith('<!DOCTYPE html') || response.trim().startsWith('<html')) {
        return response.trim();
    }
    
    // Fallback: wrap in basic HTML structure
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Generated Page</title>
</head>
<body>
    ${response}
</body>
</html>`;
}

// Generate filename from user input
function generateFilename(userInput) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const slug = userInput
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
    
    return `two-step-${slug}-${timestamp}.html`;
}

async function main() {
    console.log('🎨 Two-Step Claude Web Page Builder');
    console.log('====================================\n');
    console.log('STEP 1: Expand user input into detailed creative brief');
    console.log('STEP 2: Build web page from expanded brief');
    console.log('====================================\n');

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ Error: ANTHROPIC_API_KEY not found in .env.local');
        console.log(`Looked for .env.local at: ${envPath}`);
        console.log('Please ensure your API key is set in sms-bot/.env.local');
        process.exit(1);
    }

    console.log('✅ Loaded API key from .env.local');

    // Load expander system prompt
    let expanderPrompt;
    try {
        const expanderPath = path.join(__dirname, 'expander-prompt.json');
        const expanderData = JSON.parse(fs.readFileSync(expanderPath, 'utf8'));
        expanderPrompt = expanderData.content || expanderData.role === 'system' ? expanderData.content : JSON.stringify(expanderData);
        console.log(`📖 Loaded expander prompt from expander-prompt.json (${expanderPrompt.length} chars)`);
    } catch (error) {
        console.error('❌ Error loading expander-prompt.json:', error.message);
        process.exit(1);
    }

    // Load builder system prompt
    let builderPrompt;
    try {
        const builderPath = path.join(__dirname, 'builder-prompt.json');
        const builderData = JSON.parse(fs.readFileSync(builderPath, 'utf8'));
        builderPrompt = builderData.content || builderData.role === 'system' ? builderData.content : JSON.stringify(builderData);
        console.log(`📖 Loaded builder prompt from builder-prompt.json (${builderPrompt.length} chars)`);
    } catch (error) {
        console.error('❌ Error loading builder-prompt.json:', error.message);
        process.exit(1);
    }

    // Setup readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n💬 What kind of web page would you like to create?');
    console.log('(Type your request and press Enter, or "quit" to exit)\n');

    // Main interaction loop
    rl.on('line', async (input) => {
        const userInput = input.trim();
        
        if (userInput.toLowerCase() === 'quit' || userInput.toLowerCase() === 'exit') {
            console.log('👋 Goodbye!');
            rl.close();
            return;
        }

        if (!userInput) {
            console.log('Please enter a request for your web page:');
            return;
        }

        try {
            console.log(`\n🔥 Starting two-step build process for: "${userInput}"`);
            
            // STEP 1: Expand the user input into a detailed creative brief
            console.log(`\n📝 STEP 1: Expanding user input into detailed creative brief...`);
            const expandedBrief = await callClaude(expanderPrompt, userInput, "1 (EXPANDER)");
            
            console.log(`\n🔄 STEP 1 COMPLETE - Brief length: ${expandedBrief.length} characters`);
            console.log(`📋 Expanded Brief Summary (first 200 chars):`);
            console.log(`"${expandedBrief.substring(0, 200)}..."`);
            
            // STEP 2: Build the web page from the expanded brief
            console.log(`\n🏗️ STEP 2: Building web page from expanded brief...`);
            const webPageResponse = await callClaude(builderPrompt, expandedBrief, "2 (BUILDER)");
            
            // Extract and save HTML
            const html = extractHtml(webPageResponse);
            const filename = generateFilename(userInput);
            const filepath = path.join(__dirname, filename);
            
            fs.writeFileSync(filepath, html, 'utf8');
            
            console.log(`\n🎉 TWO-STEP BUILD COMPLETE!`);
            console.log(`✅ Generated web page saved to: ${filename}`);
            console.log(`📊 Step 1 response: ${expandedBrief.length} chars`);
            console.log(`📊 Step 2 response: ${webPageResponse.length} chars`);
            console.log(`📄 Final HTML: ${html.length} chars`);
            console.log(`\n💬 Enter another request (or "quit" to exit):`);
            
        } catch (error) {
            console.error('❌ Error in two-step process:', error.message);
            console.log('\n💬 Try again:');
        }
    });

    // Handle Ctrl+C
    rl.on('SIGINT', () => {
        console.log('\n👋 Goodbye!');
        process.exit(0);
    });
}

// Run the script
main().catch(console.error); 