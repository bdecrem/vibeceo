const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  // Let's try the AGAR.IO clone or something simpler
  // Actually, let's play a text adventure - the classic Zork!
  console.log('🎮 Loading a text adventure...');

  // Try a web-based Zork
  await page.goto('https://playclassic.games/games/adventure-dos-games-online/play-zork-great-underground-empire-online/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: '/tmp/amber-zork-1.png', fullPage: false });
  console.log('📸 Screenshot 1 saved');

  // Let's also try a simple incremental game that might work
  await page.goto('https://neal.fun/spend/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: '/tmp/amber-spend-1.png', fullPage: false });
  console.log('📸 Spend Bill Gates Money screenshot saved');

  // Let's try clicking some buy buttons!
  const buttons = await page.$$('.buy-btn, button');
  console.log(`Found ${buttons.length} buttons`);

  // Click a few things
  for (let i = 0; i < Math.min(5, buttons.length); i++) {
    try {
      await buttons[i].click();
      console.log(`Clicked button ${i + 1}`);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`Button ${i + 1} not clickable`);
    }
  }

  await page.screenshot({ path: '/tmp/amber-spend-2.png', fullPage: false });
  console.log('📸 Spend screenshot after clicking saved');

  // Get the money remaining
  const money = await page.evaluate(() => {
    const el = document.querySelector('.money') || document.querySelector('[class*="money"]');
    return el ? el.innerText : 'not found';
  });
  console.log('💰 Money status:', money);

  await browser.close();
  console.log('✅ Done!');
})();
