import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Capture console logs
page.on('console', msg => {
  const type = msg.type();
  if (type === 'error' || type === 'warning') {
    console.log('[' + type + ']', msg.text());
  }
});

// Capture errors
page.on('pageerror', err => {
  console.log('[PAGE ERROR]', err.message);
});

console.log('Loading 909...');
await page.goto('http://localhost:3000/909/');

// Wait for page to load
await page.waitForSelector('.grid');
console.log('Page loaded');

// Wait a moment to hear if there's a buzz
console.log('Waiting 3 seconds to observe audio state...');
await page.waitForTimeout(3000);

// Check AudioContext state
const audioState = await page.evaluate(() => {
  if (typeof engine !== 'undefined') {
    return {
      contextState: engine.context?.state,
      started: engine.started,
      voiceCount: engine.voices?.size,
      masterGain: engine.masterGain?.gain?.value
    };
  }
  return { error: 'engine not defined' };
});

console.log('Audio state:', audioState);

// Try clicking play to see if that changes anything
console.log('Clicking play button...');
await page.click('#play');
await page.waitForTimeout(1000);

const afterPlay = await page.evaluate(() => {
  return {
    contextState: engine.context?.state,
    started: engine.started,
  };
});
console.log('After play:', afterPlay);

// Stop
await page.click('#play');

console.log('\nBrowser will stay open for manual testing. Press Ctrl+C to exit.');
await page.waitForTimeout(60000);

await browser.close();
