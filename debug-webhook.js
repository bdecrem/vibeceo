#!/usr/bin/env node

/**
 * Debug script to simulate the exact webhook call that the form makes
 */

async function testWebhookSubmission() {
    console.log('🧪 Testing webhook submission...\n');
    
    // Test data similar to what the form would send
    const testData = {
        appName: 'Debug Test App',
        timestamp: new Date().toISOString()
    };
    
    // Test both URLs that the form might use
    const urls = [
        'http://localhost:3031/webhook/community-desktop',
        'https://webtoys-agents.ngrok.io/webhook/community-desktop'
    ];
    
    for (const url of urls) {
        console.log(`Testing ${url}...`);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost:3000'
                },
                body: JSON.stringify(testData)
            });
            
            const result = await response.json();
            console.log(`✅ ${url}: SUCCESS`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Response:`, result);
            console.log('');
            
        } catch (error) {
            console.log(`❌ ${url}: FAILED`);
            console.log(`   Error:`, error.message);
            console.log('');
        }
    }
}

testWebhookSubmission().catch(console.error);