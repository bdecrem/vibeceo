import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/amber/og-backgrounds';
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

const ASCII_PALETTES = [
  { index: 0, name: 'Amber Text', fg: '#D4A574' },
  { index: 1, name: 'Teal Matrix', fg: '#40E0D0' },
  { index: 2, name: 'Violet Code', fg: '#7B68EE' },
  { index: 3, name: 'Green Screen', fg: '#00ff41' },
  { index: 4, name: 'Warm Terminal', fg: '#ff6b35' },
];

// Distribution: 7 dense, 7 float, 6 vignette = 20 total
const GENERATION_PLAN = [
  // Dense: 7 (all 5 palettes + 2 more)
  { mode: 'dense', paletteIndex: 0 },
  { mode: 'dense', paletteIndex: 1 },
  { mode: 'dense', paletteIndex: 2 },
  { mode: 'dense', paletteIndex: 3 },
  { mode: 'dense', paletteIndex: 4 },
  { mode: 'dense', paletteIndex: 0 },
  { mode: 'dense', paletteIndex: 1 },
  // Float: 7 (all 5 palettes + 2 more)
  { mode: 'float', paletteIndex: 2 },
  { mode: 'float', paletteIndex: 3 },
  { mode: 'float', paletteIndex: 4 },
  { mode: 'float', paletteIndex: 0 },
  { mode: 'float', paletteIndex: 1 },
  { mode: 'float', paletteIndex: 2 },
  { mode: 'float', paletteIndex: 3 },
  // Vignette: 6 (all 5 palettes + 1 more)
  { mode: 'vignette', paletteIndex: 4 },
  { mode: 'vignette', paletteIndex: 0 },
  { mode: 'vignette', paletteIndex: 1 },
  { mode: 'vignette', paletteIndex: 2 },
  { mode: 'vignette', paletteIndex: 3 },
  { mode: 'vignette', paletteIndex: 4 },
];

async function generateAsciiBackgrounds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });

  await page.goto('http://localhost:3000/amber/og-design-system-v2.html?export=true');
  await page.waitForTimeout(2000);

  const backgrounds = [];
  let imageCount = 0;

  // Select ONLY ascii type
  // Default is ['music', 'ascii'], so click music to deselect it
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const musicBtn = buttons.find(b => b.textContent.includes('♪ Music'));
    if (musicBtn) musicBtn.click();
  });
  await page.waitForTimeout(200);

  for (const plan of GENERATION_PLAN) {
    imageCount++;
    const filename = `og-ascii-${String(imageCount).padStart(3, '0')}.png`;
    const palette = ASCII_PALETTES[plan.paletteIndex];

    console.log(`Generating ${imageCount}/20: ${filename} (${plan.mode}, ${palette.name})`);

    // Set palette
    await page.evaluate((paletteIndex) => {
      const swatches = document.querySelectorAll('.group.relative');
      if (swatches[paletteIndex]) swatches[paletteIndex].click();
    }, plan.paletteIndex);
    await page.waitForTimeout(100);

    // Set mode (dense/float/vignette) - cycle button until target mode
    const modeMap = { 'dense': 'Dense', 'float': 'Float', 'vignette': 'Vignette' };
    const targetText = modeMap[plan.mode];
    for (let attempts = 0; attempts < 3; attempts++) {
      const currentMode = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const modeBtn = buttons.find(b =>
          b.textContent.includes('Dense') ||
          b.textContent.includes('Float') ||
          b.textContent.includes('Vignette')
        );
        return modeBtn ? modeBtn.textContent : '';
      });
      if (currentMode.includes(targetText)) break;
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const modeBtn = buttons.find(b =>
          b.textContent.includes('Dense') ||
          b.textContent.includes('Float') ||
          b.textContent.includes('Vignette')
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
      type: 'ascii',
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

  console.log(`\nGenerated ${backgrounds.length} ascii backgrounds`);
  console.log(`Manifest updated at ${MANIFEST_PATH}`);
}

generateAsciiBackgrounds().catch(console.error);
