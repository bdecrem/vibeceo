import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/amber/og-backgrounds';
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

const MUSIC_PALETTES = [
  { index: 0, name: 'Neon Club', fg: '#00fff2' },
  { index: 1, name: 'Sunset Rave', fg: '#ff6b35' },
  { index: 2, name: 'Amber Pulse', fg: '#FFD700' },
  { index: 3, name: 'Midnight Set', fg: '#7fdbca' },
  { index: 4, name: 'Violet Hour', fg: '#7B68EE' },
];

async function generateMusicBackgrounds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });

  // Use export mode URL parameter to hide text overlays and vignettes
  await page.goto('http://localhost:3000/amber/og-design-system-v2.html?export=true');
  await page.waitForTimeout(2000);

  const backgrounds = [];
  let imageNum = 0;

  // Select ONLY music type
  // Default is ['music', 'ascii'], so we need to click ASCII to deselect it
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    // Click ASCII to deselect it (leaving only music)
    const asciiBtn = buttons.find(b => b.textContent.includes('█ ASCII'));
    if (asciiBtn) asciiBtn.click();
  });
  await page.waitForTimeout(200);

  // 20 images: 5 palettes × 2 modes × 2 each
  for (const palette of MUSIC_PALETTES) {
    for (const mode of ['vertical', 'horizontal']) {
      for (let i = 0; i < 2; i++) {
        imageNum++;
        const filename = `og-music-${String(imageNum).padStart(3, '0')}.png`;

        console.log(`Generating ${imageNum}/20: ${filename}`);

        // Set palette
        await page.evaluate((paletteIndex) => {
          const swatches = document.querySelectorAll('.group.relative');
          if (swatches[paletteIndex]) swatches[paletteIndex].click();
        }, palette.index);
        await page.waitForTimeout(100);

        // Set mode
        await page.evaluate((wantHoriz) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const modeBtn = buttons.find(b => b.textContent.includes('Horiz') || b.textContent.includes('Vert'));
          if (modeBtn) {
            const isCurrentlyHoriz = modeBtn.textContent.includes('Horiz');
            if (isCurrentlyHoriz !== wantHoriz) {
              modeBtn.click();
            }
          }
        }, mode === 'horizontal');
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
          type: 'music',
          fg: palette.fg,
          palette: palette.name,
          mode: mode
        });
      }
    }
  }

  await browser.close();

  // Create/update manifest
  let manifest = { version: '1.0', generated: new Date().toISOString(), backgrounds: [] };
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  manifest.backgrounds.push(...backgrounds);
  manifest.generated = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nGenerated ${backgrounds.length} music backgrounds`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

generateMusicBackgrounds().catch(console.error);
