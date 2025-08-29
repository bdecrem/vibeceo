#!/usr/bin/env node

/**
 * Test the webhook system to ensure new apps show up properly
 */

import fs from 'fs';

async function testWebhookSystem() {
    console.log('🧪 Testing ToyBox OS webhook system...');
    
    try {
        // Test webhook endpoint with a simple app submission
        const testSubmission = {
            appName: 'Test Webhook App',
            appFunction: 'Simple test to verify webhooks work properly',
            appIcon: '🧪',
            appType: 'simple',
            submitterName: 'webhook-test',
            source: 'testing'
        };
        
        console.log('📤 Sending test webhook...');
        
        const response = await fetch('http://localhost:3031/webhook/toybox-apps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testSubmission)
        });
        
        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Webhook response:', result);
        
        if (result.success) {
            console.log('🎉 Webhook test successful!');
            
            // Wait a moment for processing
            console.log('⏳ Waiting for processing to complete...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if the app appears in ToyBox OS
            console.log('🔍 Checking if app appears in ToyBox OS...');
            
            const toyboxResponse = await fetch('https://webtoys.ai/public/toybox-os');
            const toyboxHtml = await toyboxResponse.text();
            
            if (toyboxHtml.includes('Test Webhook App') || toyboxHtml.includes('🧪')) {
                console.log('✅ Test app found in ToyBox OS!');
                return true;
            } else {
                console.log('⚠️ Test app not yet visible in ToyBox OS (may take time to process)');
                return false;
            }
        } else {
            console.log('❌ Webhook test failed:', result);
            return false;
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Webhook server is not running (ECONNREFUSED)');
            console.log('💡 Make sure the webhook server is started with: node webhook-server.js');
            return false;
        } else {
            console.error('❌ Test failed:', error.message);
            return false;
        }
    }
}

async function checkWebhookServerStatus() {
    console.log('📡 Checking webhook server status...');
    
    try {
        const response = await fetch('http://localhost:3031/health');
        const health = await response.json();
        
        console.log('🟢 Webhook server is running');
        console.log('📊 Status:', health);
        return true;
    } catch (error) {
        console.log('🔴 Webhook server is not running');
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting ToyBox OS webhook system tests...\n');
    
    // First check if webhook server is running
    const serverRunning = await checkWebhookServerStatus();
    
    if (!serverRunning) {
        console.log('\n❌ Cannot run tests - webhook server is not running');
        console.log('💡 Start the webhook server first with:');
        console.log('   cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-edit-agent');
        console.log('   node webhook-server.js');
        return false;
    }
    
    console.log('\n🧪 Running webhook submission test...');
    const testResult = await testWebhookSystem();
    
    console.log('\n📋 Test Summary:');
    console.log('='.repeat(50));
    console.log(`Webhook Server: ${serverRunning ? '✅ Running' : '❌ Not Running'}`);
    console.log(`Submission Test: ${testResult ? '✅ Success' : '⚠️ Failed/Pending'}`);
    console.log('='.repeat(50));
    
    if (serverRunning && testResult) {
        console.log('🎉 All tests passed! The webhook system is working properly.');
    } else if (serverRunning && !testResult) {
        console.log('⚠️ Webhook server is running but submission test did not complete successfully.');
        console.log('💡 This could be normal - apps may take time to process and appear.');
    } else {
        console.log('❌ Tests failed - check the webhook server configuration.');
    }
    
    return serverRunning && testResult;
}

if (process.argv[1].endsWith('test-webhook-system.js')) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { testWebhookSystem, checkWebhookServerStatus };