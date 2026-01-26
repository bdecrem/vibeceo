import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/amber/og-backgrounds';
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

const INVENTIONS_PALETTES = [
  { index: 0, name: 'Terminal', fg: '#00ff41' },
  { index: 1, name: 'Blue Screen', fg: '#ffffff' },
  { index: 2, name: 'Amber System', fg: '#FFD700' },
  { index: 3, name: 'Corruption', fg: '#ff00ff' },
  { index: 4, name: 'CRT Burn', fg: '#ffb000' },
];

async function generateInventionsBackgrounds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });

  await page.goto('http://localhost:3000/amber/og-design-system-v2.html?export=true');
  await page.waitForTimeout(2000);

  const backgrounds = [];
  let imageCount = 0;

  // Select ONLY inventions type
  // Default is ['music', 'ascii']
  // Step 1: Click inventions (replaces music -> ['ascii', 'inventions'])
  // Step 2: Click ascii to deselect it (-> ['inventions'])
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const inventionsBtn = buttons.find(b => b.textContent.includes('⚡ Inventions'));
    if (inventionsBtn) inventionsBtn.click();
  });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const asciiBtn = buttons.find(b => b.textContent.includes('█ ASCII'));
    if (asciiBtn) asciiBtn.click();
  });
  await page.waitForTimeout(200);

  // 20 images: 5 palettes × 4 each
  for (const palette of INVENTIONS_PALETTES) {
    for (let i = 0; i < 4; i++) {
      imageCount++;
      const filename = `og-invention-${String(imageCount).padStart(3, '0')}.png`;

      console.log(`Generating ${imageCount}/20: ${filename}`);

      // Set palette
      await page.evaluate((paletteIndex) => {
        const swatches = document.querySelectorAll('.group.relative');
        if (swatches[paletteIndex]) swatches[paletteIndex].click();
      }, palette.index);
      await page.waitForTimeout(100);

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
        type: 'invention',
        fg: palette.fg,
        palette: palette.name
      });
    }
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

  console.log(`\nGenerated ${backgrounds.length} invention backgrounds`);
  console.log(`Manifest updated at ${MANIFEST_PATH}`);
}

generateInventionsBackgrounds().catch(console.error);
