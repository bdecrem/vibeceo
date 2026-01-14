import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const htmlPath = resolve(__dirname, '../web/public/amber/pulse-wave.html');
const outputPath = resolve(__dirname, '../web/public/amber/pulse-wave-og.png');

console.log('📸 Launching browser...');
const browser = await puppeteer.launch({ 
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });

console.log('📄 Loading page...');
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

// Wait for fonts to load
await page.evaluateHandle('document.fonts.ready');
await new Promise(r => setTimeout(r, 500));

console.log('📸 Taking screenshot...');
await page.screenshot({ 
  path: outputPath,
  omitBackground: false
});

await browser.close();

console.log(`✓ Screenshot saved: ${outputPath}`);
