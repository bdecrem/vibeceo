import { chromium } from 'playwright';

async function test() {
  console.log('Testing /inspiration page...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000/inspiration', { waitUntil: 'networkidle' });
    
    // Check all three format buttons exist and are clickable
    console.log('Testing format buttons...');
    
    const imageBtn = page.locator('button:has-text("Single Image")');
    const videoBtn = page.locator('button:has-text("Video")');
    const wallBtn = page.locator('button:has-text("Wall of Text")');
    
    console.log('  Image button count:', await imageBtn.count());
    console.log('  Video button count:', await videoBtn.count());
    console.log('  Wall of Text button count:', await wallBtn.count());
    
    // Check if Wall of Text is disabled
    const wallDisabled = await wallBtn.isDisabled();
    console.log('  Wall of Text disabled?', wallDisabled);
    
    // Try clicking each button
    console.log('\nClicking each format button...');
    
    await imageBtn.click();
    await page.waitForTimeout(200);
    const imageActive = await imageBtn.evaluate(el => el.classList.contains('bg-white'));
    console.log('  After clicking Image - has bg-white?', imageActive);
    
    await videoBtn.click();
    await page.waitForTimeout(200);
    const videoActive = await videoBtn.evaluate(el => el.classList.contains('bg-white'));
    console.log('  After clicking Video - has bg-white?', videoActive);
    
    await wallBtn.click();
    await page.waitForTimeout(200);
    const wallActive = await wallBtn.evaluate(el => el.classList.contains('bg-white'));
    console.log('  After clicking Wall of Text - has bg-white?', wallActive);
    
    // Screenshot
    await page.screenshot({ path: 'test-results/inspiration-format.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/inspiration-format.png');
    
    if (!wallDisabled && wallActive) {
      console.log('\n✓ Wall of Text is enabled and working!');
    } else {
      console.log('\n✗ Wall of Text issue detected');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
