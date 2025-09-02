#!/usr/bin/env node

/**
 * Test webhook functionality by sending a test webhook
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = 'http://localhost:3032';

async function testWebhook() {
    console.log('🧪 Testing webhook functionality...\n');
    
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${WEBHOOK_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('   ✅ Health check passed:', healthData.status);
    } catch (error) {
        console.log('   ❌ Health check failed:', error.message);
        return;
    }
    
    // Test 2: Send test webhook
    console.log('\n2. Testing webhook endpoint...');
    const testIssue = {
        type: 'new_issue',
        issue: {
            id: 9998,
            content_data: {
                title: 'Test Webhook Issue',
                description: 'This is a test issue to verify webhook functionality',
                author: 'webhook-test',
                status: 'open',
                targetApp: 'toybox-os-v3-test'
            }
        },
        timestamp: new Date().toISOString()
    };
    
    try {
        const webhookResponse = await fetch(`${WEBHOOK_URL}/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testIssue)
        });
        
        const webhookData = await webhookResponse.json();
        
        if (webhookData.success) {
            console.log('   ✅ Webhook test passed:', webhookData.message);
            console.log('   📝 Request ID:', webhookData.requestId);
        } else {
            console.log('   ❌ Webhook test failed:', webhookData.message);
        }
    } catch (error) {
        console.log('   ❌ Webhook test failed:', error.message);
    }
    
    // Test 3: Check manual trigger
    console.log('\n3. Testing manual trigger...');
    try {
        const triggerResponse = await fetch(`${WEBHOOK_URL}/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const triggerData = await triggerResponse.json();
        
        if (triggerData.success) {
            console.log('   ✅ Manual trigger passed');
            console.log('   📝 Issue queued:', triggerData.issue.id);
            console.log('   📋 Description:', triggerData.issue.description.substring(0, 50) + '...');
        } else {
            console.log('   ❌ Manual trigger failed:', triggerData.message);
        }
    } catch (error) {
        console.log('   ❌ Manual trigger failed:', error.message);
    }
    
    console.log('\n✨ Test complete!');
}

testWebhook().catch(console.error);