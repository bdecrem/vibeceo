#!/usr/bin/env node

/**
 * Test script for safe-wrapper.js functionality
 * Tests all main functions without modifying production data
 */

import { 
    fetchCurrentDesktop, 
    validateHTML, 
    listBackups,
    createBackup 
} from './safe-wrapper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
    log('\n🧪 Safe Wrapper Test Suite\n', 'cyan');
    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: Fetch current desktop
    try {
        log('📋 Test 1: Fetching current desktop from database...', 'blue');
        const desktop = await fetchCurrentDesktop(true);
        
        if (desktop && desktop.html_content && desktop.app_slug) {
            log(`   ✅ Successfully fetched ${desktop.app_slug}`, 'green');
            log(`   📏 Size: ${(desktop.html_content.length / 1024).toFixed(2)} KB`);
            log(`   📅 Last updated: ${desktop.updated_at}`);
            testsPassed++;
        } else {
            throw new Error('Invalid desktop data structure');
        }
    } catch (error) {
        log(`   ❌ Failed to fetch desktop: ${error.message}`, 'red');
        testsFailed++;
    }

    // Test 2: Validate HTML
    try {
        log('\n📋 Test 2: Testing HTML validation...', 'blue');
        
        // Test valid HTML
        const validHTML = `<!DOCTYPE html>
<html>
<head><title>Test Desktop</title></head>
<body>
    <div class="desktop" id="desktop">
        <div class="window-container"></div>
        <div class="menu-bar"></div>
    </div>
</body>
</html>`;
        
        const validErrors = validateHTML(validHTML);
        if (validErrors.length === 0) {
            log('   ✅ Valid HTML passed validation', 'green');
        } else {
            log(`   ⚠️  Valid HTML had warnings: ${validErrors.join(', ')}`, 'yellow');
        }
        
        // Test invalid HTML
        const invalidHTML = '<div>Invalid desktop</div>';
        const invalidErrors = validateHTML(invalidHTML);
        
        if (invalidErrors.length > 0) {
            log('   ✅ Invalid HTML correctly detected', 'green');
            log(`   📝 Errors found: ${invalidErrors.join(', ')}`);
            testsPassed++;
        } else {
            throw new Error('Validation failed to detect invalid HTML');
        }
        
        // Test dangerous code detection
        const dangerousHTML = '<!DOCTYPE html><html><body><script>eval("alert(1)")</script></body></html>';
        const dangerousErrors = validateHTML(dangerousHTML);
        
        if (dangerousErrors.some(err => err.includes('dangerous'))) {
            log('   ✅ Dangerous code correctly detected', 'green');
        } else {
            log('   ⚠️  Dangerous code not detected', 'yellow');
        }
        
    } catch (error) {
        log(`   ❌ Validation test failed: ${error.message}`, 'red');
        testsFailed++;
    }

    // Test 3: List backups
    try {
        log('\n📋 Test 3: Listing available backups...', 'blue');
        const backups = listBackups('toybox-os-v3-test');
        
        if (Array.isArray(backups)) {
            log(`   ✅ Found ${backups.length} backup(s)`, 'green');
            if (backups.length > 0) {
                const latest = backups[0];
                log(`   📝 Latest: ${latest.file}`);
                log(`   📅 Created: ${latest.timestamp}`);
                log(`   📄 Description: ${latest.description}`);
            }
            testsPassed++;
        } else {
            throw new Error('listBackups did not return an array');
        }
    } catch (error) {
        log(`   ❌ Backup listing failed: ${error.message}`, 'red');
        testsFailed++;
    }

    // Test 4: Create backup (non-destructive)
    try {
        log('\n📋 Test 4: Testing backup creation...', 'blue');
        
        const testContent = `<!DOCTYPE html>
<html>
<head><title>Test Backup</title></head>
<body>
    <div class="desktop" id="desktop">
        <div class="window-container"></div>
        <div class="menu-bar"></div>
        <p>Test backup content - ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;
        
        const backupFile = await createBackup(testContent, 'test-backup', 'Automated test backup');
        
        if (fs.existsSync(backupFile)) {
            log(`   ✅ Backup created successfully`, 'green');
            log(`   📁 Location: ${backupFile}`);
            
            // Clean up test backup
            fs.unlinkSync(backupFile);
            const metadataFile = backupFile.replace('.html', '.json');
            if (fs.existsSync(metadataFile)) {
                fs.unlinkSync(metadataFile);
            }
            log('   🧹 Test backup cleaned up');
            testsPassed++;
        } else {
            throw new Error('Backup file was not created');
        }
    } catch (error) {
        log(`   ❌ Backup creation test failed: ${error.message}`, 'red');
        testsFailed++;
    }

    // Test 5: Check environment variables
    try {
        log('\n📋 Test 5: Checking environment configuration...', 'blue');
        
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
            log('   ✅ Environment variables configured correctly', 'green');
            log(`   📍 SUPABASE_URL: ${process.env.SUPABASE_URL.substring(0, 30)}...`);
            testsPassed++;
        } else {
            throw new Error('Missing required environment variables');
        }
    } catch (error) {
        log(`   ❌ Environment check failed: ${error.message}`, 'red');
        testsFailed++;
    }

    // Summary
    log('\n' + '='.repeat(50), 'cyan');
    log('📊 Test Results Summary', 'cyan');
    log('='.repeat(50), 'cyan');
    log(`✅ Passed: ${testsPassed} tests`, 'green');
    if (testsFailed > 0) {
        log(`❌ Failed: ${testsFailed} tests`, 'red');
    }
    
    const totalTests = testsPassed + testsFailed;
    const successRate = ((testsPassed / totalTests) * 100).toFixed(1);
    
    if (testsFailed === 0) {
        log(`\n🎉 All tests passed! (${successRate}% success rate)`, 'green');
    } else {
        log(`\n⚠️  Some tests failed (${successRate}% success rate)`, 'yellow');
    }
    
    return testsFailed === 0;
}

// Run tests
console.log('🚀 Starting Safe Wrapper Tests...');
runTests()
    .then(success => {
        if (success) {
            log('\n✨ Safe wrapper is working correctly!', 'green');
            process.exit(0);
        } else {
            log('\n⚠️  Some issues detected. Please review the test results.', 'yellow');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });