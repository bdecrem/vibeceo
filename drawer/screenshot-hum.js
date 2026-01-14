const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  
  const htmlPath = path.join(__dirname, '../web/public/amber/hum.html');
  const fileUrl = 'file://' + htmlPath;
  
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  // Wait for animations to settle
  await page.waitForTimeout(7000);
  
  const screenshotPath = path.join(__dirname, '../web/public/amber/hum-og.png');
  await page.screenshot({ path: screenshotPath });
  
  console.log('Screenshot saved to:', screenshotPath);
  
  await browser.close();
})();
