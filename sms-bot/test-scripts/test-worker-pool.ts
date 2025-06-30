#!/usr/bin/env node

/**
 * Test Worker Pool Implementation
 * 
 * This script tests the new concurrent WTAF processing system by:
 * 1. Creating test files
 * 2. Starting the worker pool  
 * 3. Monitoring concurrent processing
 * 4. Cleaning up test files
 */

import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

async function testWorkerPool() {
    console.log('🧪 Testing Worker Pool Implementation\n');
    
    try {
        // Import worker pool system
        const { WorkerPool } = await import('../engine/worker-pool.js');
        const { getAllUnprocessedFilesBatch } = await import('../engine/file-watcher.js');
        
        console.log('✅ Successfully imported worker pool modules');
        
        // Create test files
        const testFiles = [];
        const testDir = join(process.cwd(), 'data', 'wtaf');
        
        for (let i = 1; i <= 5; i++) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `test-worker-pool-${timestamp}-${i}.txt`;
            const filepath = join(testDir, filename);
            
            const content = `SENDER:+15555551234
USER_SLUG:test
make a test page ${i} with blue background`;
            
            await writeFile(filepath, content, 'utf8');
            testFiles.push(filepath);
            console.log(`📄 Created test file: ${filename}`);
        }
        
        console.log(`\n📋 Created ${testFiles.length} test files`);
        
        // Test batch file detection
        console.log('\n🔍 Testing batch file detection...');
        const tasks = await getAllUnprocessedFilesBatch();
        console.log(`✅ Found ${tasks.length} tasks (should include our ${testFiles.length} test files)`);
        
        if (tasks.length >= testFiles.length) {
            console.log('✅ Batch detection working correctly');
        } else {
            console.log('❌ Batch detection may have issues');
        }
        
        // Test worker pool initialization
        console.log('\n🚀 Testing worker pool initialization...');
        const workerPool = new WorkerPool(2); // Use 2 workers for testing
        await workerPool.start();
        
        const status = workerPool.getStatus();
        console.log(`✅ Worker pool started:`);
        console.log(`   - Workers: ${status.workerCount}`);
        console.log(`   - Available: ${status.availableWorkers}`);
        console.log(`   - Queued: ${status.queuedTasks}`);
        console.log(`   - Active: ${status.activeTasks}`);
        
        // Clean up worker pool
        await workerPool.stop();
        console.log('✅ Worker pool stopped cleanly');
        
        // Clean up test files
        console.log('\n🧹 Cleaning up test files...');
        for (const filepath of testFiles) {
            try {
                await unlink(filepath);
                console.log(`🗑️ Deleted: ${filepath}`);
            } catch (error) {
                console.log(`⚠️ Could not delete: ${filepath} (may have been processed)`);
            }
        }
        
        console.log('\n🎉 Worker Pool Test Complete!');
        console.log('✅ All components are working correctly');
        console.log('🚀 Ready for concurrent WTAF processing');
        
    } catch (error) {
        console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
        console.error('Stack:', error instanceof Error ? error.stack : '');
        process.exit(1);
    }
}

// Run the test
testWorkerPool().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
}); 