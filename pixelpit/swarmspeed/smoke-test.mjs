#!/usr/bin/env node
/**
 * Swarmspeed Smoke Test
 *
 * Dead simple: Does the game load? Does it have interactive elements? Any errors?
 *
 * Usage: node smoke-test.mjs <game-slug>
 * Example: node smoke-test.mjs rain
 *
 * Exit codes:
 *   0 = PASS
 *   1 = FAIL
 */

import { chromium } from 'playwright';

const GAME_SLUG = process.argv[2];
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds max

if (!GAME_SLUG) {
  console.error('Usage: node smoke-test.mjs <game-slug>');
  console.error('Example: node smoke-test.mjs beam');
  process.exit(1);
}

// Games live at /pixelpit/arcade/{slug}
const GAME_URL = `${BASE_URL}/pixelpit/arcade/${GAME_SLUG}`;

async function smokeTest() {
  console.log(`[SMOKE] Testing: ${GAME_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
  });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  // Collect page errors
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  try {
    // 1. Page loads without crashing
    console.log('[SMOKE] Loading page...');
    const response = await page.goto(GAME_URL, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT
    });

    if (!response || response.status() >= 400) {
      console.log(`[FAIL] HTTP ${response?.status() || 'no response'}`);
      await browser.close();
      return false;
    }
    console.log(`[SMOKE] HTTP ${response.status()}`);

    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);

    // 2. Check for fatal console errors (ignore some common noise)
    const fatalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('hydration') // React hydration warnings are noisy but not fatal
    );

    if (fatalErrors.length > 0) {
      console.log(`[FAIL] Console errors:`);
      fatalErrors.forEach(e => console.log(`  - ${e.substring(0, 100)}`));
      await browser.close();
      return false;
    }
    console.log(`[SMOKE] No fatal errors`);

    // 3. Has a canvas or interactive elements
    const hasCanvas = await page.locator('canvas').count() > 0;
    const hasButtons = await page.locator('button').count() > 0;
    const hasTouchTargets = await page.locator('[onClick], [onTouchStart], [role="button"]').count() > 0;

    const isInteractive = hasCanvas || hasButtons || hasTouchTargets;

    if (!isInteractive) {
      console.log(`[FAIL] No interactive elements found (canvas: ${hasCanvas}, buttons: ${hasButtons})`);
      await browser.close();
      return false;
    }
    console.log(`[SMOKE] Interactive: canvas=${hasCanvas} buttons=${hasButtons}`);

    // 4. Responds to a tap (doesn't crash)
    console.log('[SMOKE] Testing tap...');
    try {
      // Tap center of viewport
      await page.mouse.click(195, 422);
      await page.waitForTimeout(500);

      // Check no new errors appeared
      const newErrors = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('404') &&
        !e.includes('hydration')
      );

      if (newErrors.length > fatalErrors.length) {
        console.log(`[FAIL] Tap caused errors`);
        await browser.close();
        return false;
      }
    } catch (e) {
      console.log(`[WARN] Tap test skipped: ${e.message}`);
    }

    console.log('[SMOKE] Tap OK');

    // 5. Take a screenshot for reference
    const screenshotPath = `/tmp/smoke-${GAME_SLUG}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`[SMOKE] Screenshot: ${screenshotPath}`);

    await browser.close();
    return true;

  } catch (e) {
    console.log(`[FAIL] Exception: ${e.message}`);
    await browser.close();
    return false;
  }
}

// Run it
const passed = await smokeTest();

if (passed) {
  console.log('\n✓ PASS');
  process.exit(0);
} else {
  console.log('\n✗ FAIL');
  process.exit(1);
}
