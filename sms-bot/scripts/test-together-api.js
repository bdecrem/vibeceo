#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testTogetherAPI() {
    console.log('🔧 Testing Together.ai API Connection...');
    console.log('=====================================');
    
    // 1. Check if API key exists
    const apiKey = process.env.TOGETHER_API_KEY;
    console.log(`🔑 API Key Status: ${apiKey ? '✅ Found' : '❌ Missing'}`);
    if (apiKey) {
        console.log(`🔑 API Key Length: ${apiKey.length} characters`);
        console.log(`🔑 API Key Preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
    }
    
    if (!apiKey) {
        console.log('❌ TOGETHER_API_KEY not found in environment variables');
        console.log('📝 Please add TOGETHER_API_KEY to your .env.local file');
        return;
    }
    
    console.log('\n🧪 Testing Moodboard Builder Generation...');
    console.log('==========================================');
    
    try {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-V3',
                messages: [
                    { 
                        role: 'user', 
                        content: 'Create a FULLY FUNCTIONAL HTML+JavaScript web page for a moodboard builder where users can drag random aesthetic images onto a canvas. Include: working drag-and-drop functionality, image gallery with sample images, canvas drop zone, delete/clear options, and modern styling. Make it completely functional and ready to use in a browser!' 
                    }
                ],
                max_tokens: 4000,
                temperature: 0.2,
                top_p: 0.95,
                stop: ['<|im_end|>', 'Human:', 'Assistant:']
            })
        });
        
        console.log(`📊 Response Status: ${response.status}`);
        console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ API Error: ${response.status} ${response.statusText}`);
            console.log(`❌ Error Details: ${errorText}`);
            return;
        }
        
        const data = await response.json();
        console.log(`✅ API Response Structure:`, Object.keys(data));
        
        if (data.choices && data.choices.length > 0) {
            // Chat completions uses message.content instead of text
            const result = data.choices[0].message?.content || data.choices[0].text || '';
            console.log(`✅ Generated Content Length: ${result.length} characters`);
            console.log(`📋 Generated Content Preview:`);
            console.log('---');
            console.log(result.substring(0, 300) + (result.length > 300 ? '...' : ''));
            console.log('---');
            
            // Test if it contains HTML
            if (result.includes('<') && result.includes('>')) {
                console.log('✅ Contains HTML tags - Good!');
                
                // Save the HTML to a file
                const outputPath = path.join(__dirname, '..', 'moodboard-builder.html');
                
                // Extract just the HTML content (remove any markdown formatting)
                let htmlContent = result;
                if (result.includes('```html')) {
                    const htmlStart = result.indexOf('```html') + 7;
                    const htmlEnd = result.lastIndexOf('```');
                    htmlContent = result.substring(htmlStart, htmlEnd).trim();
                }
                
                fs.writeFileSync(outputPath, htmlContent);
                console.log(`💾 Saved complete crossword to: ${outputPath}`);
                console.log(`🌐 Open this file in your browser to play!`);
                
            } else {
                console.log('⚠️ No HTML tags detected');
            }
            
        } else {
            console.log('❌ No choices in response');
            console.log('📋 Full Response:', JSON.stringify(data, null, 2));
        }
        
    } catch (error) {
        console.log(`❌ Network/Request Error: ${error.message}`);
        console.log(`❌ Error Stack: ${error.stack}`);
    }
}

// Run the test
testTogetherAPI().catch(console.error); 