// Script to generate the WTAF OpenGraph image
// You'll need to run: npm install puppeteer

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generateOGImage() {
  console.log('Generating WTAF OpenGraph image...');
  
  // Path to the HTML template and output file
  const htmlTemplatePath = path.join(__dirname, '../public/wtaf/wtaf-og-template.html');
  const outputPath = path.join(__dirname, '../public/wtaf/og-image.png');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
  });
  
  const page = await browser.newPage();
  
  // Set viewport to the OG image dimensions
  await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 1,
  });
  
  // Load HTML template
  const htmlContent = fs.readFileSync(htmlTemplatePath, 'utf8');
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Take screenshot
  await page.screenshot({
    path: outputPath,
    type: 'png',
    quality: 100,
  });
  
  await browser.close();
  console.log(`OpenGraph image generated and saved to ${outputPath}`);
}

generateOGImage().catch(console.error);
