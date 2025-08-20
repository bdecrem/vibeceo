#!/usr/bin/env node

// Test the correct webhook URL

import fetch from 'node-fetch';

const CORRECT_WEBHOOK_URL = 'https://009ef44e91c0.ngrok.app/webhook/toybox-apps';

async function testCorrectWebhook() {
    console.log('🧪 Testing correct webhook URL...');
    console.log('📡 URL:', CORRECT_WEBHOOK_URL);
    
    const testPayload = {
        appName: 'Test App Fixed',
        appFunction: 'This is a test to verify the corrected webhook works',
        appIcon: '✅',
        appType: 'simple',
        submitterName: 'Test User',
        source: 'app-studio'
    };
    
    console.log('📤 Sending test payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    try {
        const response = await fetch(CORRECT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });
        
        console.log('📥 Response status:', response.status, response.statusText);
        
        const responseText = await response.text();
        console.log('📝 Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Correct webhook submission successful!');
            console.log('🔧 App Studio should be updated to use this URL');
        } else {
            console.log('❌ Webhook submission failed');
        }
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
    }
}

// Run test
testCorrectWebhook();