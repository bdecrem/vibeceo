const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  // Load the local HTML file directly
  const htmlPath = path.join(__dirname, '../web/public/amber/rabbithole/index.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle2' });

  await page.screenshot({ path: '/tmp/amber-rabbithole-preview.png' });
  console.log('Screenshot saved to /tmp/amber-rabbithole-preview.png');

  // Click the button and wait for it to start
  await page.click('#startBtn');
  await new Promise(r => setTimeout(r, 8000)); // Wait for a few jumps

  await page.screenshot({ path: '/tmp/amber-rabbithole-running.png' });
  console.log('Running screenshot saved to /tmp/amber-rabbithole-running.png');

  await browser.close();
})();
