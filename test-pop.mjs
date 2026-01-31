// test-pop.mjs - Playwright test for Pop game
import { chromium } from 'playwright';

const GAME = 'pop';
const URL = `http://localhost:3000/pixelpit/arcade/${GAME}`;

async function test() {
  console.log(`Testing ${GAME}...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });

  const page = await context.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // 1. LOAD TEST
    console.log('1. Loading...');
    const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 10000 });

    if (!response || response.status() !== 200) {
      console.log('FAIL: Page did not load (status: ' + (response?.status() || 'none') + ')');
      await browser.close();
      return false;
    }

    await page.screenshot({ path: `test-${GAME}-1-loaded.png` });
    console.log('   Screenshot: test-' + GAME + '-1-loaded.png');

    // 2. CHECK FOR VISIBLE CONTENT
    console.log('2. Checking content...');
    const bodyText = await page.locator('body').innerText();
    if (bodyText.trim().length < 10) {
      console.log('FAIL: Page appears blank');
      await browser.close();
      return false;
    }
    console.log('   Content length: ' + bodyText.trim().length + ' chars');

    // 3. FIND AND CLICK START BUTTON
    console.log('3. Looking for START button...');
    const startBtn = page.locator('button:has-text("START"), button:has-text("PLAY"), button:has-text("Start"), button:has-text("Play")');
    const btnCount = await startBtn.count();

    if (btnCount === 0) {
      console.log('FAIL: No START/PLAY button found');
      await page.screenshot({ path: `test-${GAME}-no-start.png` });
      await browser.close();
      return false;
    }

    console.log('   Found ' + btnCount + ' start button(s)');
    await startBtn.first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-${GAME}-2-playing.png` });
    console.log('   Screenshot: test-' + GAME + '-2-playing.png');

    // 4. CHECK FOR CANVAS OR GAME AREA
    console.log('4. Checking game canvas...');
    const canvas = page.locator('canvas');
    const canvasCount = await canvas.count();

    if (canvasCount === 0) {
      console.log('WARN: No canvas found (might be DOM-based game)');
    } else {
      const canvasBox = await canvas.first().boundingBox();
      if (!canvasBox || canvasBox.width < 100 || canvasBox.height < 100) {
        console.log('FAIL: Canvas has no size');
        await browser.close();
        return false;
      }
      console.log('   Canvas size: ' + canvasBox.width + 'x' + canvasBox.height);
    }

    // 5. TEST TOUCH/CLICK INTERACTION
    console.log('5. Testing game interaction...');
    // Click in the middle of the game area to trigger a pop
    await page.mouse.click(195, 400);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-${GAME}-3-interaction.png` });
    console.log('   Screenshot: test-' + GAME + '-3-interaction.png');

    // 6. CHECK FOR ERRORS
    console.log('6. Checking for errors...');
    if (errors.length > 0) {
      console.log('FAIL: Console errors found:');
      errors.forEach(e => console.log('   - ' + e));
      await browser.close();
      return false;
    }

    console.log('\nPASS: Game loads and runs');
    await browser.close();
    return true;

  } catch (err) {
    console.log('FAIL: ' + err.message);
    await page.screenshot({ path: `test-${GAME}-error.png` });
    await browser.close();
    return false;
  }
}

test().then(passed => {
  process.exit(passed ? 0 : 1);
});
