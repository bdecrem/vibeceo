#!/usr/bin/env node

// Test script to debug App Studio submission issues

import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://hook.us2.make.com/7h7vxk4hshkk1m9bgiqxq7bwqdbtjsrg';

async function testWebhookSubmission() {
    console.log('🧪 Testing App Studio webhook submission...');
    
    const testPayload = {
        appName: 'Test App',
        appFunction: 'This is a test app to verify submission works',
        appIcon: '🧪',
        appType: 'simple',
        submitterName: 'Test User',
        source: 'app-studio'
    };
    
    console.log('📤 Sending test payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });
        
        console.log('📥 Response status:', response.status, response.statusText);
        
        const responseText = await response.text();
        console.log('📝 Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Webhook submission successful!');
        } else {
            console.log('❌ Webhook submission failed');
            console.log('This might be why the App Studio is showing "Failed to submit"');
        }
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
    }
}

async function testZADAPI() {
    console.log('\n🧪 Testing ZAD API access...');
    
    const zadPayload = {
        app_id: 'app-studio',
        data_type: 'submission',
        content_data: {
            submitterName: 'Test User',
            appType: 'simple', 
            appName: 'Test App',
            appFunction: 'Test function',
            appIcon: '🧪',
            timestamp: new Date().toISOString()
        },
        participant_id: 'test-participant',
        action_type: 'save'
    };
    
    try {
        // Test from localhost (this should fail but tells us if it's a CORS issue)
        const response = await fetch('http://localhost:3000/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zadPayload)
        });
        
        console.log('📥 ZAD API response status:', response.status);
        
        if (response.status === 404) {
            console.log('ℹ️  ZAD API not accessible from Node.js (expected - browser only)');
        } else {
            const responseText = await response.text();
            console.log('📝 ZAD API response:', responseText);
        }
        
    } catch (error) {
        console.log('ℹ️  ZAD API test failed (expected from Node.js):', error.message);
    }
}

// Run tests
testWebhookSubmission();
testZADAPI();