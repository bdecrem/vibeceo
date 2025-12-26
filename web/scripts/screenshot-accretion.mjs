import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function screenshot() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 900 });

  // Load the local HTML file
  const htmlPath = join(__dirname, '../public/amber/accretion/index.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Wait for canvas to render and some particles to appear
  await page.waitForSelector('canvas');
  await new Promise(r => setTimeout(r, 3000)); // Let particles drift in

  // Hide loading text and hints for cleaner screenshot
  await page.evaluate(() => {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    const hint = document.querySelector('.hint');
    if (hint) hint.style.display = 'none';
  });

  // Wait a bit more for nice particle positions
  await new Promise(r => setTimeout(r, 2000));

  // Take screenshot
  const outputPath = join(__dirname, '../public/amber/accretion-screenshot.png');
  await page.screenshot({
    path: outputPath,
    type: 'png'
  });

  console.log(`Screenshot saved to: ${outputPath}`);

  await browser.close();
}

screenshot().catch(console.error);
