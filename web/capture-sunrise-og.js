const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 }
  });
  
  const htmlPath = path.join(__dirname, 'public/amber/sunrise.html');
  await page.goto(`file://${htmlPath}`);
  
  // Wait for animations to settle
  await page.waitForTimeout(3000);
  
  // Ensure images directory exists
  const imagesDir = path.join(__dirname, 'public/amber/images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  await page.screenshot({ 
    path: path.join(imagesDir, 'sunrise-og.png')
  });
  
  await browser.close();
  console.log('✓ sunrise-og.png created');
})();
