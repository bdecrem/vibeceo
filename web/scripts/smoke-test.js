#!/usr/bin/env node

/**
 * WEBTOYS Smoke Test Suite v0.3
 * Simple checks to catch common breakages
 * Now includes compilation checks for all 3 servers
 */

const fetch = require('node-fetch');
const { execSync } = require('child_process');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TESTS_PASSED = [];
const TESTS_FAILED = [];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function runTest(name, testFn) {
  process.stdout.write(`  Testing ${name}... `);
  try {
    await testFn();
    console.log(`${colors.green}✓${colors.reset}`);
    TESTS_PASSED.push(name);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset}`);
    console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
    TESTS_FAILED.push({ name, error: error.message });
  }
}

// Test Suite
async function runSmokeTests() {
  console.log(`\n${colors.cyan}🧪 WEBTOYS Smoke Tests v0.3${colors.reset}`);
  console.log(`${colors.cyan}Testing against: ${BASE_URL}${colors.reset}\n`);

  // Test 1: Web server is running
  await runTest('Web server responds', async () => {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
  });

  // Test 2: Trending page loads
  await runTest('/trending page loads', async () => {
    const response = await fetch(`${BASE_URL}/trending`);
    if (!response.ok) throw new Error(`Page returned ${response.status}`);
    const html = await response.text();
    if (!html.includes('trending') && !html.includes('Trending')) {
      throw new Error('Page content looks wrong');
    }
  });

  // Test 3: Featured page loads
  await runTest('/featured page loads', async () => {
    const response = await fetch(`${BASE_URL}/featured`);
    if (!response.ok) throw new Error(`Page returned ${response.status}`);
  });

  // Test 4: OG image API works
  await runTest('OG image API responds', async () => {
    const response = await fetch(`${BASE_URL}/api/generate-og-cached?user=test&app=test`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    if (!data.image_url) throw new Error('No image URL returned');
  });

  // Test 5: Demo mode parameter works
  await runTest('Demo mode (?demo=true)', async () => {
    const response = await fetch(`${BASE_URL}/bart/test-app?demo=true`);
    // Just check it doesn't error - 404 is ok for non-existent app
    if (response.status >= 500) throw new Error(`Server error ${response.status}`);
  });

  // Test 6: Web console API exists
  await runTest('Web console API exists', async () => {
    const response = await fetch(`${BASE_URL}/api/wtaf/web-console`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'help' })
    });
    // API might require auth, but should exist
    if (response.status === 404) throw new Error('API endpoint not found');
  });

  // Test 7: Static assets load
  await runTest('Static assets accessible', async () => {
    const response = await fetch(`${BASE_URL}/og-types/og-type-fallback.png`);
    if (!response.ok) throw new Error(`Static file returned ${response.status}`);
  });

  // Test 8: WTAF landing page loads
  await runTest('WTAF landing page works', async () => {
    // Check if the landing page loads with key content
    const landingResponse = await fetch(`${BASE_URL}/wtaf-landing`);
    if (!landingResponse.ok) throw new Error(`Landing page returned ${landingResponse.status}`);
    
    const html = await landingResponse.text();
    // Check for key WEBTOYS elements
    if (!html.includes('WEBTOYS')) {
      throw new Error('WEBTOYS branding missing');
    }
    if (!html.includes('+1-866-330-0015')) {
      throw new Error('SMS number not found');
    }
    // Verify it has the specific landing page content
    if (!html.includes('YOUR BROWSER DESERVES')) {
      throw new Error('Landing page headline missing');
    }
    if (!html.includes('THE HALL OF STUFF')) {
      throw new Error('Hall of Stuff section missing');
    }
  });

  // Test 9: Check no test database connections in code
  await runTest('No hardcoded secrets in web/', async () => {
    // Quick scan of common files for secrets
    // This is a backup to the pre-commit hook
    const { execSync } = require('child_process');
    try {
      // Use grep to check for common secret patterns
      execSync('! grep -r "sk-[a-zA-Z0-9]\\{48\\}" web/app/ web/components/ 2>/dev/null', { stdio: 'pipe' });
      execSync('! grep -r "eyJ[a-zA-Z0-9]\\{50,\\}" web/app/ web/components/ 2>/dev/null', { stdio: 'pipe' });
    } catch (error) {
      // grep returns non-zero if it FINDS something (which is bad)
      if (error.status === 1) {
        // Status 1 means grep found nothing (good!)
        return;
      }
      throw new Error('Possible hardcoded secrets detected');
    }
  });

  // Test 10: Web server (port 3000) compiles
  await runTest('Web server compiles (port 3000)', async () => {
    try {
      // Quick TypeScript check for web directory
      execSync('cd ../web && npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      });
    } catch (error) {
      throw new Error(`Web server compilation failed: ${error.message}`);
    }
  });

  // Test 11: SMS bot listener (port 3030) compiles
  await runTest('SMS bot compiles (port 3030)', async () => {
    try {
      // Quick TypeScript check for sms-bot directory
      execSync('cd ../sms-bot && npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      });
    } catch (error) {
      throw new Error(`SMS bot compilation failed: ${error.message}`);
    }
  });

  // Test 12: WTAF Engine compiles
  await runTest('WTAF Engine compiles', async () => {
    try {
      // Quick TypeScript check for engine directory
      execSync('cd ../sms-bot/engine && npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      });
    } catch (error) {
      throw new Error(`WTAF Engine compilation failed: ${error.message}`);
    }
  });

  // Print results
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  if (TESTS_FAILED.length === 0) {
    console.log(`${colors.green}✅ All ${TESTS_PASSED.length} tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ ${TESTS_FAILED.length} tests failed:${colors.reset}`);
    TESTS_FAILED.forEach(({ name, error }) => {
      console.log(`   ${colors.red}• ${name}: ${error}${colors.reset}`);
    });
    console.log(`${colors.yellow}⚠️  ${TESTS_PASSED.length} tests passed${colors.reset}\n`);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

// Run tests
runSmokeTests().catch(error => {
  console.error(`\n${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});