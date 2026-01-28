#!/usr/bin/env node
/**
 * Take a screenshot of a URL
 * Usage: node screenshot.mjs <url> <output.png>
 */

import { chromium } from 'playwright';

const url = process.argv[2];
const output = process.argv[3];

if (!url || !output) {
  console.error('Usage: node screenshot.mjs <url> <output.png>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 600 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(500);

// Click to start the game (dismisses title/start screens)
await page.click('body');
await page.waitForTimeout(300);
await page.click('body');
await page.waitForTimeout(500);

// One more click and let it run
await page.click('body');
await page.waitForTimeout(1000);

await page.screenshot({ path: output });
await browser.close();
console.log('OK');
