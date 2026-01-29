import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));

console.log('Loading 909...');
await page.goto('http://localhost:3000/909/', { waitUntil: 'networkidle' });
await page.waitForSelector('#play-toggle', { timeout: 10000 });
console.log('Page loaded\n');

// Helper to check audio
async function checkAudio(label) {
  const info = await page.evaluate(() => {
    const e = window.engine;
    if (!e) return { error: 'no engine' };

    const analyser = e.analyser;
    const timeData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeData);

    let sum = 0;
    let maxAmp = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i];
      if (Math.abs(timeData[i]) > maxAmp) maxAmp = Math.abs(timeData[i]);
    }
    const dcOffset = sum / timeData.length;

    // Get compressor reduction
    const compRed = e.compressor?.reduction || 0;

    return {
      maxAmplitude: maxAmp.toFixed(4),
      dcOffset: dcOffset.toFixed(6),
      compressorReduction: compRed.toFixed(2),
      hasAudio: maxAmp > 0.001,
      samples: Array.from(timeData.slice(0, 3)).map(v => v.toFixed(4)),
    };
  });
  console.log(`[${label}] maxAmp: ${info.maxAmplitude}, dc: ${info.dcOffset}, comp: ${info.compressorReduction}, hasAudio: ${info.hasAudio}`);
  if (info.hasAudio) {
    console.log(`  samples: ${info.samples.join(', ')}`);
  }
  return info;
}

// First, let's play with default kit and check
console.log('=== DEFAULT KIT TEST ===');
await page.click('#play-toggle');
await page.waitForTimeout(2000);
await page.click('#play-toggle');
await page.waitForTimeout(2000);
await checkAudio('DEFAULT STOPPED (2s)');

// Load Punchy and play for longer
console.log('\n=== PUNCHY KIT - LONGER PLAY ===');
await page.selectOption('#kit-select', { label: 'Punchy' });
await page.waitForTimeout(500);
await checkAudio('AFTER PUNCHY LOAD');

await page.click('#play-toggle');
console.log('Playing...');
await page.waitForTimeout(3000);
await checkAudio('PUNCHY PLAYING (3s)');

await page.click('#play-toggle');
console.log('Stopped');

// Check multiple times
for (let i = 1; i <= 10; i++) {
  await page.waitForTimeout(500);
  const result = await checkAudio(`PUNCHY STOPPED (+${i * 500}ms)`);
  if (!result.hasAudio && i >= 4) {
    console.log('Audio cleared - stopping check loop');
    break;
  }
}

// Now try Bart Deep
console.log('\n=== BART DEEP KIT ===');
await page.selectOption('#kit-select', { label: 'Bart Deep' });
await page.waitForTimeout(500);
await checkAudio('AFTER BART DEEP LOAD');

await page.click('#play-toggle');
await page.waitForTimeout(3000);
await page.click('#play-toggle');
await page.waitForTimeout(2000);
const bartDeepResult = await checkAudio('BART DEEP STOPPED (2s)');

// Try Boomy
console.log('\n=== BOOMY KIT ===');
await page.selectOption('#kit-select', { label: 'Boomy' });
await page.waitForTimeout(500);

await page.click('#play-toggle');
await page.waitForTimeout(3000);
await page.click('#play-toggle');
await page.waitForTimeout(2000);
const boomyResult = await checkAudio('BOOMY STOPPED (2s)');

// Now directly trigger kick multiple times without sequencer
console.log('\n=== DIRECT KICK TRIGGER TEST (NO SEQUENCER) ===');
await page.selectOption('#kit-select', { label: 'Punchy' });
await page.waitForTimeout(500);

// Trigger kick 10 times rapidly
await page.evaluate(() => {
  const e = window.engine;
  // Make sure context is running
  if (e.context.state === 'suspended') {
    e.context.resume();
  }

  for (let i = 0; i < 10; i++) {
    e.trigger('kick', 1.0, e.context.currentTime + i * 0.2);
  }
  console.log('Triggered kick 10 times');
});

await page.waitForTimeout(3000);
const directKickResult = await checkAudio('AFTER DIRECT KICK TRIGGERS (3s)');

if (directKickResult.hasAudio) {
  console.log('\n!!! STUCK AUDIO AFTER DIRECT KICK TRIGGERS !!!');

  // Try to identify what's still running
  await page.evaluate(() => {
    const e = window.engine;
    const kick = e.voices.get('kick');
    console.log('Kick class:', kick.constructor.name);

    // Check if there are any WebAudio nodes we can inspect
    // Unfortunately Web Audio doesn't expose running oscillators directly
  });
}

console.log('\n--- Browser stays open. Ctrl+C to exit ---');
await page.waitForTimeout(60000);
await browser.close();
