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
  }
});

console.log('\n=== Testing Video Colors (2-scene mode) ===\n');

await page.goto('http://localhost:3000/inspiration');
await page.waitForLoadState('networkidle');

// Fill topic with something colorful
await page.fill('input[type="text"]', 'vibrant tropical sunset over the ocean');

// Select Video mode (should be default)
console.log('Using Video mode (default)...');

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

  if (images >= 2 && spinners === 0) {
    console.log(`Images loaded: ${images}`);
    break;
  }

  await page.waitForTimeout(2000);
  attempts++;
}

// Take screenshot of comp selection
await page.screenshot({ path: 'test-results/video-colors-comps.png', fullPage: true });
console.log('Screenshot: test-results/video-colors-comps.png');

// Select first comp (A)
console.log('Selecting Comp A...');
await page.click('[alt="Comp A"]');
await page.waitForTimeout(500);

// Click generate video
console.log('\nGenerating video (this takes ~30-60 seconds)...');
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
await page.screenshot({ path: 'test-results/video-colors-result.png', fullPage: true });
console.log('Screenshot: test-results/video-colors-result.png');

console.log('\n=== CHECK THE VIDEO FOR COLORS ===');
console.log('If colors are present in the video, the fix worked!\n');

// Keep browser open for manual inspection
console.log('Browser left open - press Ctrl+C to close');
await page.waitForTimeout(60000);

await browser.close();
