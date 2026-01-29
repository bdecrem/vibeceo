import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Collect all console messages
const consoleLogs = [];
page.on('console', msg => {
  const text = `[${msg.type()}] ${msg.text()}`;
  consoleLogs.push(text);
  console.log('CONSOLE:', text);
});

// Monitor network requests
const networkRequests = [];
page.on('request', req => {
  if (req.url().includes('/inspiration/api/')) {
    console.log('REQUEST:', req.method(), req.url());
    networkRequests.push({ method: req.method(), url: req.url(), time: Date.now() });
  }
});

page.on('response', async res => {
  if (res.url().includes('/inspiration/api/')) {
    const status = res.status();
    console.log('RESPONSE:', status, res.url());

    // If it's an error or the image API, log the body
    if (status !== 200 || res.url().includes('/image')) {
      try {
        const body = await res.text();
        if (body.length < 500) {
          console.log('RESPONSE BODY:', body);
        } else {
          console.log('RESPONSE BODY (truncated):', body.substring(0, 200) + '...');
        }
      } catch (e) {
        console.log('Could not read response body');
      }
    }
  }
});

// Navigate to the page
console.log('\n=== Starting test ===\n');
await page.goto('http://localhost:3000/inspiration');
await page.waitForLoadState('networkidle');

console.log('\n=== Page loaded, filling form ===\n');

// Fill in topic
await page.fill('input[type="text"]', 'why cats are better than dogs');

// Click generate
console.log('\n=== Clicking Generate ===\n');
await page.click('button:has-text("Generate Comps")');

// Wait for storyboard response
console.log('\n=== Waiting for storyboard API ===\n');
await page.waitForResponse(res => res.url().includes('/storyboard'), { timeout: 30000 });

console.log('\n=== Storyboard received, waiting for images ===\n');

// Wait up to 60 seconds for image responses
const startTime = Date.now();
const imageResponses = [];

while (Date.now() - startTime < 60000) {
  // Check if we have comp cards with images
  const compImages = await page.locator('img[alt^="Comp"]').count();
  const spinners = await page.locator('.animate-spin').count();

  console.log(`Time: ${Math.floor((Date.now() - startTime) / 1000)}s | Images: ${compImages} | Spinners: ${spinners}`);

  // Check for error messages
  const errorEl = await page.locator('text=Something went wrong').count();
  if (errorEl > 0) {
    const errorText = await page.locator('.text-red-400\\/70').textContent();
    console.log('\n=== ERROR DETECTED ===');
    console.log('Error:', errorText);
    break;
  }

  // Check if images loaded
  if (compImages >= 2 && spinners === 0) {
    console.log('\n=== SUCCESS: Images loaded ===');
    break;
  }

  await page.waitForTimeout(2000);
}

// Take screenshot
await page.screenshot({ path: 'test-results/inspiration-debug.png', fullPage: true });
console.log('\n=== Screenshot saved to test-results/inspiration-debug.png ===\n');

// Print summary
console.log('\n=== SUMMARY ===');
console.log('Network requests to /inspiration/api/:');
networkRequests.forEach(r => console.log(`  ${r.method} ${r.url}`));

console.log('\nConsole errors:');
consoleLogs.filter(l => l.includes('[error]')).forEach(l => console.log(`  ${l}`));

// Check page state
const pageState = await page.evaluate(() => {
  // Look for React state in the DOM or any debug info
  const imgs = document.querySelectorAll('img[alt^="Comp"]');
  const spinners = document.querySelectorAll('.animate-spin');
  return {
    imageCount: imgs.length,
    spinnerCount: spinners.length,
    imageSrcs: Array.from(imgs).map(img => img.src?.substring(0, 50) + '...')
  };
});

console.log('\nPage state:', pageState);

await browser.close();
