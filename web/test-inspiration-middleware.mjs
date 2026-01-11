/**
 * Playwright test: Verify /inspiration route loads correctly
 *
 * Run: node web/test-inspiration-middleware.mjs
 * Requires: npm run dev running on localhost:3000
 */

import { chromium } from 'playwright';

async function test() {
  console.log('Starting Playwright test for /inspiration route...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  try {
    // Test 1: Route loads (not redirected to Webtoys)
    console.log('Test 1: Loading /inspiration...');
    await page.goto('http://localhost:3000/inspiration', { waitUntil: 'networkidle' });

    const title = await page.title();
    console.log(`  Title: "${title}"`);

    if (!title.includes('Inspiration')) {
      throw new Error(`Expected title to include "Inspiration", got "${title}"`);
    }
    console.log('  ✓ Route loaded with correct title\n');

    // Test 2: Not Webtoys (check for webtoys-specific elements)
    console.log('Test 2: Verifying not Webtoys page...');
    const hasWebtoys = await page.locator('[data-webtoys]').count();
    if (hasWebtoys > 0) {
      throw new Error('Page appears to be Webtoys (found data-webtoys attribute)');
    }
    console.log('  ✓ Not Webtoys page\n');

    // Test 3: Key UI elements present
    console.log('Test 3: Checking UI elements...');

    const header = await page.locator('h1:has-text("Inspiration")').count();
    if (header === 0) {
      throw new Error('Missing header with "Inspiration"');
    }
    console.log('  ✓ Header present');

    const topicInput = await page.locator('input[placeholder*="acai"]').count();
    if (topicInput === 0) {
      throw new Error('Missing topic input field');
    }
    console.log('  ✓ Topic input present');

    const modeButtons = await page.locator('button:has-text("Image"), button:has-text("Video")').count();
    if (modeButtons < 2) {
      throw new Error('Missing mode selection buttons');
    }
    console.log('  ✓ Mode buttons present');

    const styleButtons = await page.locator('button:has-text("Illuminated"), button:has-text("Paper Cut"), button:has-text("Tech Dark")').count();
    if (styleButtons < 3) {
      throw new Error('Missing style selection buttons');
    }
    console.log('  ✓ Style buttons present');

    const generateButton = await page.locator('button:has-text("Generate")').count();
    if (generateButton === 0) {
      throw new Error('Missing generate button');
    }
    console.log('  ✓ Generate button present\n');

    // Test 4: Interaction works
    console.log('Test 4: Testing interaction...');
    await page.fill('input[placeholder*="acai"]', 'test topic');
    const inputValue = await page.inputValue('input[placeholder*="acai"]');
    if (inputValue !== 'test topic') {
      throw new Error('Input not accepting text');
    }
    console.log('  ✓ Input accepts text');

    // Click a style button
    await page.click('button:has-text("Tech Dark")');
    console.log('  ✓ Style selection works\n');

    // Screenshot for visual verification
    await page.screenshot({ path: 'test-results/inspiration-ui.png', fullPage: true });
    console.log('  Screenshot saved to test-results/inspiration-ui.png\n');

    console.log('═══════════════════════════════════');
    console.log('  ALL TESTS PASSED ✓');
    console.log('═══════════════════════════════════\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    await page.screenshot({ path: 'test-results/inspiration-error.png', fullPage: true });
    console.log('  Error screenshot saved to test-results/inspiration-error.png');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

test();
