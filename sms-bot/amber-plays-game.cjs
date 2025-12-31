const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Let's go to Cookie Clicker - the classic incremental game
  console.log('🍪 Loading Cookie Clicker...');
  await page.goto('https://orteil.dashnet.org/cookieclicker/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for the game to load
  await new Promise(r => setTimeout(r, 5000));

  // Take a screenshot to see what we're working with
  await page.screenshot({ path: '/tmp/amber-game-1.png', fullPage: false });
  console.log('📸 Screenshot 1 saved');

  // Look for the language selector (usually appears first)
  try {
    const langEnglish = await page.$('#langSelect-EN');
    if (langEnglish) {
      console.log('🌐 Found language selector - clicking English');
      await langEnglish.click();
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (e) {
    console.log('No language selector found, continuing...');
  }

  // Take another screenshot
  await page.screenshot({ path: '/tmp/amber-game-2.png', fullPage: false });
  console.log('📸 Screenshot 2 saved');

  // Now let's find and click the big cookie!
  console.log('🖱️ Looking for the big cookie...');

  // Click in the center-left where the cookie usually is
  for (let i = 0; i < 50; i++) {
    await page.mouse.click(200, 400);
    if (i % 10 === 0) console.log(`Clicked ${i + 1} times...`);
  }

  await page.screenshot({ path: '/tmp/amber-game-3.png', fullPage: false });
  console.log('📸 Screenshot 3 saved after 50 clicks!');

  // Let's see what our cookie count is
  const cookieCount = await page.evaluate(() => {
    const el = document.querySelector('#cookies');
    return el ? el.innerText : 'not found';
  });
  console.log('🍪 Cookie count:', cookieCount);

  await browser.close();
  console.log('✅ Done! Check /tmp/amber-game-*.png');
})();
