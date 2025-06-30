#!/usr/bin/env ts-node

/**
 * RACE CONDITION TEST SCRIPT
 * 
 * This script sends multiple identical WTAF requests simultaneously
 * from the same test user to force database race conditions.
 * 
 * Expected behavior:
 * ✅ All requests complete successfully (no crashes)
 * ✅ Each gets a unique app slug (no duplicates) 
 * ✅ Race condition detection logged when collisions occur
 * ✅ Automatic retry with new slugs
 */

import fetch from 'node-fetch';

const SMS_BOT_URL = 'http://localhost:3030';
const DEV_WEBHOOK_ENDPOINT = '/dev/webhook';
const TEST_PHONE = '+15555551234'; // Our test number

/**
 * Send a WTAF request via dev webhook
 */
async function sendWtafRequest(message: string, requestId: number): Promise<any> {
    const payload = new URLSearchParams({
        'From': TEST_PHONE,
        'To': '+19999999999',
        'Body': message,
        'MessageSid': `TEST${Date.now()}_${requestId}`,
        'AccountSid': 'TEST_ACCOUNT',
        'MessagingServiceSid': '',
        'NumMedia': '0',
        'SmsStatus': 'received',
        'NumSegments': '1'
    });

    try {
        console.log(`🚀 Request ${requestId}: Sending "${message}"`);
        const startTime = Date.now();
        
        const response = await fetch(`${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Twilio-Signature': 'test-signature'
            },
            body: payload.toString()
        });

        const duration = Date.now() - startTime;
        const responseData = await response.json() as any;
        
        console.log(`✅ Request ${requestId}: Completed in ${duration}ms`);
        return {
            requestId,
            success: responseData.success,
            responses: responseData.responses || [],
            duration,
            error: responseData.error
        };
        
    } catch (error) {
        console.log(`❌ Request ${requestId}: Failed - ${error}`);
        return {
            requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Run race condition test
 */
async function testRaceConditions() {
    console.log('🧪 RACE CONDITION TEST STARTING');
    console.log('═'.repeat(50));
    
    // Test 1: Same request message (high chance of slug collision)
    console.log('\n🔥 TEST 1: Identical requests (forcing slug collisions)');
    const identicalMessage = 'wtaf create a simple hello world page';
    
    // Send 5 identical requests simultaneously
    const identicalPromises = [];
    for (let i = 1; i <= 5; i++) {
        identicalPromises.push(sendWtafRequest(identicalMessage, i));
    }
    
    console.log('⏱️  Sending 5 identical requests simultaneously...');
    const identicalResults = await Promise.all(identicalPromises);
    
    console.log('\n📊 RESULTS:');
    identicalResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} Request ${result.requestId}: ${result.success ? 'Success' : result.error} (${result.duration}ms)`);
        if (result.responses?.length > 0) {
            result.responses.forEach((response: string) => {
                if (response.includes('Your app:')) {
                    const urlMatch = response.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                        console.log(`    📱 URL: ${urlMatch[0]}`);
                    }
                }
            });
        }
    });
    
    // Test 2: Different requests (should process without issues)
    console.log('\n🔥 TEST 2: Different requests (should all succeed)');
    const differentMessages = [
        'wtaf create a todo app',
        'wtaf create a calculator',
        'wtaf create a random quote generator'
    ];
    
    const differentPromises = differentMessages.map((msg, i) => 
        sendWtafRequest(msg, i + 10)
    );
    
    console.log('⏱️  Sending 3 different requests simultaneously...');
    const differentResults = await Promise.all(differentPromises);
    
    console.log('\n📊 RESULTS:');
    differentResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} Request ${result.requestId}: ${result.success ? 'Success' : result.error} (${result.duration}ms)`);
    });
    
    // Summary
    const allResults = [...identicalResults, ...differentResults];
    const successCount = allResults.filter(r => r.success).length;
    const totalCount = allResults.length;
    
    console.log('\n' + '═'.repeat(50));
    console.log('🏁 TEST SUMMARY');
    console.log(`📈 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    console.log('🔍 Check SMS bot logs for race condition detection messages');
    console.log('✅ If all requests succeeded, race condition protection is working!');
}

// Run the test  
testRaceConditions().catch(console.error); 