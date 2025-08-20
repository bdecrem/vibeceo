#!/usr/bin/env node

// Test the fixed webhook URL

import fetch from 'node-fetch';

const FIXED_WEBHOOK_URL = 'https://webtoys-agents.ngrok.app/webhook/toybox-apps';

async function testFixedWebhook() {
    console.log('🧪 Testing fixed webhook URL...');
    console.log('📡 URL:', FIXED_WEBHOOK_URL);
    
    const testPayload = {
        appName: 'Test App Fixed v2',
        appFunction: 'This is a test to verify the fixed webhook works',
        appIcon: '🎯',
        appType: 'simple',
        submitterName: 'Test User',
        source: 'app-studio'
    };
    
    console.log('📤 Sending test payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    try {
        const response = await fetch(FIXED_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });
        
        console.log('📥 Response status:', response.status, response.statusText);
        
        const responseText = await response.text();
        console.log('📝 Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Fixed webhook submission successful!');
            console.log('🎉 App Studio should now work properly');
        } else {
            console.log('❌ Webhook submission still failing');
        }
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
    }
}

// Run test
testFixedWebhook();