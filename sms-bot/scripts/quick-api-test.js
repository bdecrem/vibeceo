#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function quickAPITest() {
    console.log('🚀 Quick Together.ai API Test...');
    console.log('================================');
    
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
        console.log('❌ No API key found');
        return;
    }
    
    console.log('✅ API key found, testing with simple prompt...');
    
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
                        content: 'Hello! Just say "API is working" and nothing else.' 
                    }
                ],
                max_tokens: 50,
                temperature: 0.1
            })
        });
        
        console.log(`📊 Status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Error: ${errorText}`);
            return;
        }
        
        const data = await response.json();
        const result = data.choices?.[0]?.message?.content || 'No content';
        console.log(`✅ Response: ${result}`);
        console.log('🎉 API is working!');
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

quickAPITest().catch(console.error); 