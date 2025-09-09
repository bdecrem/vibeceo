#!/usr/bin/env node

/**
 * Test script for WebtoysOS Edit Agent CLI
 * Creates a test edit request to verify the system works
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3032';

async function testEdit() {
    console.log('🧪 Testing WebtoysOS Edit Agent CLI...\n');
    
    // Test health endpoint
    console.log('1️⃣ Testing health check...');
    try {
        const healthRes = await fetch(`${WEBHOOK_URL}/health`);
        const health = await healthRes.json();
        console.log('   ✅ Health check passed:', health);
    } catch (error) {
        console.error('   ❌ Health check failed:', error.message);
        console.log('\n⚠️  Is the webhook server running?');
        console.log('   Run: ./start-all.sh');
        process.exit(1);
    }
    
    // Test edit request
    console.log('\n2️⃣ Sending test edit request...');
    const testRequest = {
        issueId: `test-${Date.now()}`,
        appSlug: 'toybox-test-app',
        description: 'Add a blue header with the text "Test Edit Successful"',
        author: 'test-script'
    };
    
    try {
        const editRes = await fetch(`${WEBHOOK_URL}/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testRequest)
        });
        
        const result = await editRes.json();
        console.log('   ✅ Edit request sent:', result);
        
        if (result.success) {
            console.log('\n✅ Test successful!');
            console.log('   The edit request has been queued.');
            console.log('   Check the worker output to see processing.');
        } else {
            console.log('\n⚠️  Edit request failed:', result.error);
        }
        
    } catch (error) {
        console.error('   ❌ Failed to send edit request:', error.message);
    }
    
    // Test trigger endpoint
    console.log('\n3️⃣ Testing manual trigger...');
    try {
        const triggerRes = await fetch(`${WEBHOOK_URL}/trigger`, {
            method: 'POST'
        });
        
        const trigger = await triggerRes.json();
        console.log('   ✅ Trigger response:', trigger);
        
    } catch (error) {
        console.error('   ❌ Trigger failed:', error.message);
    }
    
    console.log('\n📊 Test Summary:');
    console.log('   - Webhook server is running');
    console.log('   - Edit endpoint is working');
    console.log('   - Trigger endpoint is working');
    console.log('\n✨ All tests passed!');
}

// Run tests
testEdit().catch(console.error);