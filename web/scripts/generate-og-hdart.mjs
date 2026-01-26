import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/amber/og-backgrounds';
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

const HDART_PALETTES = [
  { index: 0, name: 'Amber Orb', fg: '#FFD700' },
  { index: 1, name: 'Teal Glow', fg: '#40E0D0' },
  { index: 2, name: 'Violet Shine', fg: '#7B68EE' },
  { index: 3, name: 'Dawn', fg: '#ffd6e0' },
  { index: 4, name: 'Golden Hour', fg: '#F5C87A' },
];

// Distribution: 7 orb, 7 aurora, 6 prism = 20 total
const GENERATION_PLAN = [
  // Orb: 7
  { mode: 'orb', paletteIndex: 0 },
  { mode: 'orb', paletteIndex: 1 },
  { mode: 'orb', paletteIndex: 2 },
  { mode: 'orb', paletteIndex: 3 },
  { mode: 'orb', paletteIndex: 4 },
  { mode: 'orb', paletteIndex: 0 },
  { mode: 'orb', paletteIndex: 1 },
  // Aurora: 7
  { mode: 'aurora', paletteIndex: 2 },
  { mode: 'aurora', paletteIndex: 3 },
  { mode: 'aurora', paletteIndex: 4 },
  { mode: 'aurora', paletteIndex: 0 },
  { mode: 'aurora', paletteIndex: 1 },
  { mode: 'aurora', paletteIndex: 2 },
  { mode: 'aurora', paletteIndex: 3 },
  // Prism: 6
  { mode: 'prism', paletteIndex: 4 },
  { mode: 'prism', paletteIndex: 0 },
  { mode: 'prism', paletteIndex: 1 },
  { mode: 'prism', paletteIndex: 2 },
  { mode: 'prism', paletteIndex: 3 },
  { mode: 'prism', paletteIndex: 4 },
];

async function generateHdartBackgrounds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });

  await page.goto('http://localhost:3000/amber/og-design-system-v2.html?export=true');
  await page.waitForTimeout(2000);

  const backgrounds = [];
  let imageCount = 0;

  // Select ONLY highdef type
  // Default is ['music', 'ascii']
  // Step 1: Click highdef (replaces music -> ['ascii', 'highdef'])
  // Step 2: Click ascii to deselect it (-> ['highdef'])
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const highdefBtn = buttons.find(b => b.textContent.includes('○ High-def'));
    if (highdefBtn) highdefBtn.click();
  });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const asciiBtn = buttons.find(b => b.textContent.includes('█ ASCII'));
    if (asciiBtn) asciiBtn.click();
  });
  await page.waitForTimeout(200);

  for (const plan of GENERATION_PLAN) {
    imageCount++;
    const filename = `og-hd-art-${String(imageCount).padStart(3, '0')}.png`;
    const palette = HDART_PALETTES[plan.paletteIndex];

    console.log(`Generating ${imageCount}/20: ${filename} (${plan.mode}, ${palette.name})`);

    // Set palette
    await page.evaluate((paletteIndex) => {
      const swatches = document.querySelectorAll('.group.relative');
      if (swatches[paletteIndex]) swatches[paletteIndex].click();
    }, plan.paletteIndex);
    await page.waitForTimeout(100);

    // Set mode (orb/aurora/prism) - cycle button until target mode
    const modeMap = { 'orb': 'Orb', 'aurora': 'Aurora', 'prism': 'Prism' };
    const targetText = modeMap[plan.mode];
    for (let attempts = 0; attempts < 3; attempts++) {
      const currentMode = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const modeBtn = buttons.find(b =>
          b.textContent.includes('Orb') ||
          b.textContent.includes('Aurora') ||
          b.textContent.includes('Prism')
        );
        return modeBtn ? modeBtn.textContent : '';
      });
      if (currentMode.includes(targetText)) break;
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const modeBtn = buttons.find(b =>
          b.textContent.includes('Orb') ||
          b.textContent.includes('Aurora') ||
          b.textContent.includes('Prism')
        );
        if (modeBtn) modeBtn.click();
      });
      await page.waitForTimeout(100);
    }

    // Regenerate with new seed
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const regenBtn = buttons.find(b => b.textContent.includes('Regenerate'));
      if (regenBtn) regenBtn.click();
    });
    await page.waitForTimeout(300);

    // Screenshot the preview
    const preview = await page.$('.relative.w-full.rounded-lg.overflow-hidden.shadow-2xl');
    if (preview) {
      await preview.screenshot({ path: path.join(OUTPUT_DIR, filename) });
    }

    backgrounds.push({
      file: filename,
      type: 'hd-art',
      fg: palette.fg,
      palette: palette.name,
      mode: plan.mode
    });
  }

  await browser.close();

  // Load and update manifest
  let manifest = { version: '1.0', generated: new Date().toISOString(), backgrounds: [] };
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  manifest.backgrounds.push(...backgrounds);
  manifest.generated = new Date().toISOString();

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nGenerated ${backgrounds.length} hd-art backgrounds`);
  console.log(`Manifest updated at ${MANIFEST_PATH}`);
}

generateHdartBackgrounds().catch(console.error);
