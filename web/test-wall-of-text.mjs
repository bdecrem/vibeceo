import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Collect console messages
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('ERROR:', msg.text());
  }
});

// Monitor API calls
page.on('response', async res => {
  if (res.url().includes('/inspiration/api/')) {
    const status = res.status();
    const endpoint = res.url().split('/api/')[1]?.split('?')[0];
    console.log(`API [${status}] ${endpoint}`);

    if (status !== 200) {
      try {
        const body = await res.text();
        console.log('Error:', body.substring(0, 300));
      } catch {}
    }
  }
});

console.log('\n=== Testing Wall of Text Mode ===\n');

await page.goto('http://localhost:3000/inspiration');
await page.waitForLoadState('networkidle');

// Fill topic
await page.fill('input[type="text"]', 'the rise and fall of disco music');

// Select Wall of Text mode
console.log('Selecting Wall of Text mode...');
await page.click('button:has-text("Wall of Text")');

// Click generate
console.log('Generating storyboard...');
await page.click('button:has-text("Generate Comps")');

// Wait for storyboard
await page.waitForResponse(res => res.url().includes('/storyboard') && res.status() === 200, { timeout: 60000 });
console.log('Storyboard received');

// Wait for images
console.log('Waiting for images...');
let attempts = 0;
while (attempts < 60) {
  const images = await page.locator('img[alt^="Comp"]').count();
  const spinners = await page.locator('.animate-spin').count();

  if (images >= 1 && spinners === 0) {
    console.log(`Images loaded: ${images}`);
    break;
  }

  await page.waitForTimeout(2000);
  attempts++;
}

// Take screenshot of comp selection
await page.screenshot({ path: 'test-results/wall-of-text-comps.png', fullPage: true });
console.log('Screenshot: test-results/wall-of-text-comps.png');

// Select first comp (A)
console.log('Selecting Comp A...');
await page.click('[alt="Comp A"]');
await page.waitForTimeout(500);

// Click generate video
console.log('\nGenerating video (this takes ~60 seconds)...');
await page.click('button:has-text("Generate")');

// Wait for video generation
let videoAttempts = 0;
while (videoAttempts < 90) {
  // Check for video element
  const video = await page.locator('video').count();
  if (video > 0) {
    console.log('Video generated!');
    break;
  }

  // Check for error
  const error = await page.locator('text=Something went wrong').count();
  if (error > 0) {
    const errorText = await page.locator('.text-red-400\\/70').textContent();
    console.log('ERROR:', errorText);
    break;
  }

  // Check progress
  const progress = await page.locator('.text-amber-200').first().textContent().catch(() => null);
  if (progress && videoAttempts % 5 === 0) {
    console.log('Progress:', progress);
  }

  await page.waitForTimeout(2000);
  videoAttempts++;
}

// Final screenshot
await page.screenshot({ path: 'test-results/wall-of-text-result.png', fullPage: true });
console.log('Screenshot: test-results/wall-of-text-result.png');

await browser.close();
console.log('\nDone!');
