import { chromium } from 'playwright';

const URL = 'http://localhost:3000/909/ui/tr909/index.html';

async function test() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    bypassCSP: true,
  });
  // Disable cache
  await context.route('**/*', async route => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  });
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    console.log('PAGE:', msg.text());
  });

  // Capture page errors
  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.message);
  });

  // Log network requests for JS files
  page.on('request', req => {
    if (req.url().includes('.js')) {
      console.log('Loading:', req.url().split('/').slice(-2).join('/'));
    }
  });

  console.log(`Opening ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });

  // Wait longer for JS to fully initialize
  await page.waitForTimeout(2000);

  // Wait for the voice params to render
  await page.waitForSelector('#voice-params', { timeout: 5000 });

  // Log all data-param-id values for kick knobs
  const kickParamIds = await page.evaluate(() => {
    const kickPanel = document.querySelector('.voice-panel[data-voice-id="kick"]');
    if (!kickPanel) return ['no kick panel found'];
    const knobs = kickPanel.querySelectorAll('.knob');
    return Array.from(knobs).map(k => k.dataset.paramId);
  });
  console.log('Kick knob param IDs:', kickParamIds);

  // Get all knob labels for BD (kick)
  const bdPanel = await page.locator('.voice-panel').first();
  const bdLabels = await bdPanel.locator('.knob-label').allTextContents();
  console.log('BD (kick) knob labels:', bdLabels);

  // Look for the Sweep knob label
  const sweepLabel = await page.locator('.knob-label:text("Sweep")').first();
  const hasSweep = await sweepLabel.isVisible().catch(() => false);

  if (hasSweep) {
    console.log('✅ Sweep knob found!');

    // Try clicking on Bart Deep kit
    const kitSelect = await page.locator('#kit-select');
    await kitSelect.selectOption('bart-deep');
    console.log('Selected Bart Deep kit');

    // Wait a moment for kit to load
    await page.waitForTimeout(500);

    // Trigger the kick to hear it
    await page.keyboard.press('1');
    console.log('Triggered kick sound');

    await page.waitForTimeout(1000);
  } else {
    console.log('❌ Sweep knob NOT found in BD panel');
  }

  // Keep browser open for 3 seconds to see/hear
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('Done.');
}

test().catch(console.error);
