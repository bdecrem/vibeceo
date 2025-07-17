#!/usr/bin/env node

// Test script to directly test the update_task API endpoint
// This will help us isolate whether the issue is in the backend or frontend

const fetch = require('node-fetch');

async function testUpdateTask() {
    console.log('🧪 Testing update_task API endpoint...');
    
    const testAppId = '3729736f-2021-4d58-bc54-0ab7765da07f'; // From the broken app
    const testParticipantId = 'test_participant_123';
    
    try {
        // Step 1: Create a test record first
        console.log('1️⃣ Creating test record...');
        const createResponse = await fetch('http://localhost:3000/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: testAppId,
                participant_id: testParticipantId,
                participant_data: {
                    userLabel: 'Test User',
                    username: 'Test User'
                },
                action_type: 'person',
                content_data: {
                    name: 'Test Person',
                    completed: false,
                    notes: 'Initial notes',
                    timestamp: Date.now(),
                    participant_id: testParticipantId
                }
            })
        });
        
        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.error('❌ Failed to create test record:', errorData);
            return;
        }
        
        const createResult = await createResponse.json();
        console.log('✅ Test record created:', createResult);
        
        const recordId = createResult.data.id;
        console.log('📝 Record ID:', recordId, 'Type:', typeof recordId);
        
        // Step 2: Test update_task with this record
        console.log('2️⃣ Testing update_task...');
        const updateResponse = await fetch('http://localhost:3000/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: testAppId,
                participant_id: testParticipantId,
                participant_data: {
                    userLabel: 'Test User',
                    username: 'Test User'
                },
                action_type: 'update_task',
                content_data: {
                    taskId: recordId,
                    updates: {
                        completed: true,
                        notes: 'Updated notes from test'
                    }
                }
            })
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('❌ update_task failed:', errorData);
            console.error('Response status:', updateResponse.status);
            return;
        }
        
        const updateResult = await updateResponse.json();
        console.log('✅ update_task succeeded:', updateResult);
        
        // Step 3: Verify the update by loading the record
        console.log('3️⃣ Verifying update by loading record...');
        const loadResponse = await fetch(`http://localhost:3000/api/zad/load?app_id=${encodeURIComponent(testAppId)}&action_type=person&participant_id=${encodeURIComponent(testParticipantId)}`);
        
        if (!loadResponse.ok) {
            const errorData = await loadResponse.json();
            console.error('❌ Failed to load records:', errorData);
            return;
        }
        
        const loadResult = await loadResponse.json();
        console.log('📋 Loaded records:', loadResult);
        
        const updatedRecord = loadResult.find(r => r.id === recordId);
        if (updatedRecord) {
            console.log('✅ Updated record found:', {
                id: updatedRecord.id,
                completed: updatedRecord.content_data.completed,
                notes: updatedRecord.content_data.notes,
                name: updatedRecord.content_data.name
            });
            
            if (updatedRecord.content_data.completed === true && updatedRecord.content_data.notes === 'Updated notes from test') {
                console.log('🎉 SUCCESS: update_task is working correctly!');
            } else {
                console.log('❌ FAILURE: update_task did not apply updates correctly');
                console.log('Expected: completed=true, notes="Updated notes from test"');
                console.log('Actual:', updatedRecord.content_data);
            }
        } else {
            console.log('❌ FAILURE: Could not find updated record');
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
    }
}

// Run the test
testUpdateTask().catch(console.error); 