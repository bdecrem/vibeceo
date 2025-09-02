#!/usr/bin/env node

/**
 * Test script for Issue Tracker → Edit Agent CLI webhook integration
 */

import fetch from 'node-fetch';

const NGROK_URL = 'https://03ffa53d166c.ngrok.app';
const ISSUE_TRACKER_URL = 'https://webtoys.ai/public/toybox-issue-tracker-v3';

console.log('🧪 Testing Issue Tracker → Edit Agent CLI Integration\n');

async function testWebhook() {
    console.log('1️⃣ Testing webhook endpoint directly...');
    
    try {
        const testIssue = {
            type: 'new_issue',
            issue: {
                id: 'test-' + Date.now(),
                content_data: {
                    title: 'Test Issue from Integration Script',
                    description: 'This is a test issue to verify webhook integration',
                    status: 'open',
                    author: 'test-script',
                    created: new Date().toISOString()
                }
            },
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(`${NGROK_URL}/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testIssue)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Webhook test successful!');
            console.log('   Response:', result);
        } else {
            console.error('❌ Webhook test failed!');
            console.error('   Status:', response.status);
            console.error('   Response:', await response.text());
        }
    } catch (error) {
        console.error('❌ Failed to connect to webhook server!');
        console.error('   Error:', error.message);
        console.error('\n⚠️  Make sure the webhook server is running:');
        console.error('   cd sms-bot/webtoys-os/agents/edit-agent-cli');
        console.error('   ./start-all.sh');
    }
}

async function showConfiguration() {
    console.log('\n2️⃣ Configuration Instructions:');
    console.log('   To configure the Issue Tracker with this webhook:');
    console.log('   1. Open: ' + ISSUE_TRACKER_URL);
    console.log('   2. Click the "⚙️ Webhook" button');
    console.log('   3. Enter webhook URL: ' + NGROK_URL);
    console.log('   4. Click "Save Settings"');
    console.log('\n   Or run this in the browser console:');
    console.log(`   window.configureWebhook('${NGROK_URL}')`);
}

async function testTrigger() {
    console.log('\n3️⃣ Testing manual trigger endpoint...');
    
    try {
        const response = await fetch(`${NGROK_URL}/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Manual trigger successful!');
            console.log('   Response:', result);
        } else {
            console.error('❌ Manual trigger failed!');
            console.error('   Status:', response.status);
        }
    } catch (error) {
        console.error('❌ Failed to connect to trigger endpoint!');
        console.error('   Error:', error.message);
    }
}

// Run tests
await testWebhook();
await showConfiguration();
await testTrigger();

console.log('\n✨ Integration test complete!');
console.log('\n📝 Next steps:');
console.log('   1. Configure the webhook URL in Issue Tracker');
console.log('   2. Create a new issue in Issue Tracker');
console.log('   3. Check the Edit Agent CLI logs for processing');
console.log('\n📁 Monitor logs:');
console.log('   tail -f sms-bot/webtoys-os/agents/edit-agent-cli/logs/webhook.log');
console.log('   tail -f sms-bot/webtoys-os/agents/edit-agent-cli/logs/worker.log');