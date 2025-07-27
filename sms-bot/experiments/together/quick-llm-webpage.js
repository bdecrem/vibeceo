#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { injectMobileControls } from './mobile-controls-injector.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from sms-bot/.env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found');
    console.log(`Expected location: ${envPath}`);
    console.log('Please create sms-bot/.env.local with your TOGETHER_API_KEY');
    process.exit(1);
}
dotenv.config({ path: envPath });

// Simple Together.ai API client with retry logic
async function callTogetherAI(systemPrompt, userPrompt, retries = 3) {
    const models = [
        'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8',
        'Qwen/Qwen2.5-Coder-32B-Instruct',
        'deepseek-ai/DeepSeek-V3'
    ];
    
    let lastError;
    
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
        const model = models[modelIndex];
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`\n🚀 Sending to Together.ai API (Model: ${model}, Attempt ${attempt}/${retries})...`);
                
                const requestBody = {
                    model: model,
                    max_tokens: 8192,
                    temperature: 0.7,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ]
                };

                const response = await fetch('https://api.together.xyz/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    timeout: 30000 // 30 second timeout
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = `Together.ai API error: ${response.status} ${response.statusText}`;
                    console.error(`❌ ${errorMessage}`);
                    
                    // If it's a 502/503/504 error, retry with backoff
                    if (response.status >= 502 && response.status <= 504 && attempt < retries) {
                        console.log(`⏳ Retrying in ${attempt * 2} seconds...`);
                        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                        continue;
                    }
                    
                    // If it's a model-specific error, try next model
                    if (response.status === 404 || response.status === 400) {
                        console.log(`🔄 Model ${model} not available, trying next model...`);
                        break; // Break inner loop to try next model
                    }
                    
                    lastError = new Error(errorMessage);
                    continue;
                }

                const data = await response.json();
                console.log(`✅ Successfully generated with model: ${model}`);
                return data.choices[0].message.content;
                
            } catch (error) {
                lastError = error;
                console.error(`❌ Error: ${error.message}`);
                
                if (attempt < retries) {
                    console.log(`⏳ Retrying in ${attempt * 2} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                }
            }
        }
    }
    
    throw lastError || new Error('Failed to generate response with all available models');
}

// Extract HTML from LLM response
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
    <title>Generated Page</title>
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
    
    return `quick-${slug}-${timestamp}.html`;
}

// Open file in default browser
async function openInBrowser(filepath) {
    const platform = process.platform;
    let command;
    
    if (platform === 'darwin') {
        command = `open "${filepath}"`;
    } else if (platform === 'win32') {
        command = `start "" "${filepath}"`;
    } else {
        command = `xdg-open "${filepath}"`;
    }
    
    try {
        await execAsync(command);
        return true;
    } catch (error) {
        console.error('⚠️  Could not auto-open in browser:', error.message);
        return false;
    }
}

async function main() {
    console.log('🎨 Quick LLM Web Page Generator (Together.ai)');
    console.log('============================================\n');

    // Check for API key
    if (!process.env.TOGETHER_API_KEY) {
        console.error('❌ Error: TOGETHER_API_KEY not found in .env.local');
        process.exit(1);
    }

    console.log('✅ Loaded Together.ai API key from .env.local');

    // Load system prompt from game-tech-spec.json
    let systemPrompt;
    try {
        const promptPath = path.join(__dirname, '..', '..', 'content', 'builder-game-fixed-controls.json');
        const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
        systemPrompt = promptData.content || promptData.prompt || promptData.system || JSON.stringify(promptData);
        console.log(`📖 Loaded system prompt from builder-game-fixed-controls.json (${systemPrompt.length} chars)`);
    } catch (error) {
        console.error('❌ Error loading builder-game.json:', error.message);
        console.log('Using default system prompt...');
        systemPrompt = `You are an expert web developer. Create beautiful, functional, and complete HTML pages based on user requests. 
Your HTML should include:
- Complete HTML5 structure
- Inline CSS for styling
- Inline JavaScript if needed for interactivity
- Mobile-responsive design
- Modern, clean aesthetics

Always return the complete HTML wrapped in \`\`\`html code blocks.`;
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
            console.log(`\n📝 Request: "${userInput}"`);
            
            // Call Together.ai
            const response = await callTogetherAI(systemPrompt, userInput);
            
            // Extract and save HTML
            let html = extractHtml(response);
            
            // Inject mobile controls if it looks like a game
            const isGame = userInput.toLowerCase().includes('game') || 
                          userInput.toLowerCase().includes('play') ||
                          html.includes('canvas') ||
                          html.includes('requestAnimationFrame');
            
            if (isGame) {
                console.log('🎮 Detected game - injecting mobile controls...');
                html = injectMobileControls(html);
            }
            
            const filename = generateFilename(userInput);
            const filepath = path.join(__dirname, filename);
            
            fs.writeFileSync(filepath, html, 'utf8');
            
            console.log(`\n✅ Generated web page saved to: ${filename}`);
            console.log(`📄 File path: ${filepath}`);
            
            // Try to open in browser
            const opened = await openInBrowser(filepath);
            if (opened) {
                console.log('🌐 Opened in your default browser!');
            } else {
                console.log(`🔗 Click to view: file://${filepath}`);
            }
            
            console.log(`\n💬 Enter another request (or "quit" to exit):`);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
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