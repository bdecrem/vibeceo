import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));

console.log('Loading 909...');
await page.goto('http://localhost:3000/909/', { waitUntil: 'networkidle' });
await page.waitForSelector('#play-toggle', { timeout: 10000 });
console.log('Page loaded\n');

// Helper to check audio activity
async function checkAudio(label) {
  const info = await page.evaluate(() => {
    const e = window.engine;
    if (!e) return { error: 'no engine' };

    // Check analyser for audio activity
    const analyser = e.analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Sum of all frequency bins - if > 0, there's audio
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = sum / dataArray.length;

    // Find dominant frequency
    let maxVal = 0;
    let maxIdx = 0;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxVal) {
        maxVal = dataArray[i];
        maxIdx = i;
      }
    }
    const sampleRate = e.context.sampleRate;
    const dominantFreq = maxIdx * sampleRate / (2 * dataArray.length);

    return {
      isPlaying: e.isPlaying(),
      contextState: e.context?.state,
      audioLevel: avg.toFixed(2),
      hasAudio: avg > 1,
      dominantFreq: Math.round(dominantFreq),
      maxLevel: maxVal,
    };
  });
  console.log(`[${label}]`, info);
  return info;
}

// Start clean
await checkAudio('INITIAL - should be silent');

// Play
console.log('\n=== PLAY ===');
await page.click('#play-toggle');
await page.waitForTimeout(1000);
await checkAudio('PLAYING');

// Stop
console.log('\n=== STOP ===');
await page.click('#play-toggle');
await page.waitForTimeout(500);
await checkAudio('AFTER STOP - should be silent');

// Load Punchy kit
console.log('\n=== LOAD PUNCHY KIT ===');
await page.selectOption('#kit-select', { label: 'Punchy' });
await page.waitForTimeout(500);
await checkAudio('AFTER PUNCHY LOAD - should be silent');

// Play
console.log('\n=== PLAY WITH PUNCHY ===');
await page.click('#play-toggle');
await page.waitForTimeout(1000);
await checkAudio('PLAYING PUNCHY');

// Stop
console.log('\n=== STOP ===');
await page.click('#play-toggle');
await page.waitForTimeout(500);
const afterStop = await checkAudio('AFTER STOP - SHOULD BE SILENT (bug if not)');

if (afterStop.hasAudio) {
  console.log('\n!!! BUG DETECTED: Audio still playing after stop !!!');

  // Wait and check again
  await page.waitForTimeout(2000);
  await checkAudio('2 SEC LATER - still has audio?');

  // Try switching kit
  console.log('\n=== SWITCH TO E1 CLASSIC ===');
  await page.selectOption('#kit-select', { label: 'E1 Classic' });
  await page.waitForTimeout(500);
  await checkAudio('AFTER E1 CLASSIC - should be silent now');
}

// Try Bart Deep
console.log('\n=== LOAD BART DEEP ===');
await page.selectOption('#kit-select', { label: 'Bart Deep' });
await page.waitForTimeout(500);
await checkAudio('AFTER BART DEEP LOAD');

await page.click('#play-toggle');
await page.waitForTimeout(1000);
await page.click('#play-toggle');
await page.waitForTimeout(500);
await checkAudio('AFTER BART DEEP STOP - bug if has audio');

console.log('\n--- Browser stays open. Ctrl+C to exit ---');
await page.waitForTimeout(60000);
await browser.close();
