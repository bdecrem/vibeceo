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

    return {
      maxAmplitude: maxAmp.toFixed(4),
      dcOffset: dcOffset.toFixed(6),
      hasAudio: maxAmp > 0.001,
    };
  });
  console.log(`[${label}] maxAmp: ${info.maxAmplitude}, dcOffset: ${info.dcOffset}, hasAudio: ${info.hasAudio}`);
  return info;
}

// Load Punchy and play/stop
console.log('=== LOAD PUNCHY AND PLAY/STOP ===');
await page.selectOption('#kit-select', { label: 'Punchy' });
await page.waitForTimeout(500);

await page.click('#play-toggle');
await page.waitForTimeout(1000);
await page.click('#play-toggle');
await page.waitForTimeout(2000);
await checkAudio('PUNCHY STOPPED (2s)');

// Now disconnect voices one by one to find culprit
console.log('\n=== FINDING CULPRIT VOICE ===');

const voiceIds = ['kick', 'snare', 'clap', 'rimshot', 'ltom', 'mtom', 'htom', 'ch', 'oh', 'crash', 'ride'];

for (const voiceId of voiceIds) {
  // Disconnect this voice
  await page.evaluate((id) => {
    const voice = window.engine.voices.get(id);
    if (voice) {
      voice.disconnect();
      console.log(`Disconnected ${id}`);
    }
  }, voiceId);

  await page.waitForTimeout(100);
  const result = await checkAudio(`After disconnecting ${voiceId}`);

  if (!result.hasAudio) {
    console.log(`\n!!! CULPRIT FOUND: ${voiceId} !!!\n`);
    break;
  }
}

// Now let's investigate the culprit more deeply
console.log('\n=== FRESH TEST WITH JUST KICK ===');
// Reload page
await page.goto('http://localhost:3000/909/', { waitUntil: 'networkidle' });
await page.waitForSelector('#play-toggle', { timeout: 10000 });

// Load Punchy
await page.selectOption('#kit-select', { label: 'Punchy' });
await page.waitForTimeout(500);

// Mute all voices except kick
await page.evaluate(() => {
  const e = window.engine;
  const voiceIds = ['snare', 'clap', 'rimshot', 'ltom', 'mtom', 'htom', 'ch', 'oh', 'crash', 'ride'];
  voiceIds.forEach(id => {
    const voice = e.voices.get(id);
    if (voice) voice.output.gain.value = 0;
  });
  console.log('Muted all except kick');
});

await checkAudio('After muting all except kick');

// Play and stop
await page.click('#play-toggle');
await page.waitForTimeout(1000);
await page.click('#play-toggle');
await page.waitForTimeout(2000);
const kickOnlyResult = await checkAudio('KICK ONLY - after stop (2s)');

if (kickOnlyResult.hasAudio) {
  console.log('\n!!! KICK IS THE CULPRIT !!!');

  // Check kick voice internals
  console.log('\n=== CHECKING KICK VOICE INTERNALS ===');
  await page.evaluate(() => {
    const kick = window.engine.voices.get('kick');
    console.log('Kick voice class:', kick.constructor.name);
    console.log('Kick output gain:', kick.output?.gain?.value);
    console.log('Kick tune:', kick.tune);
    console.log('Kick decay:', kick.decay);
    console.log('Kick attack:', kick.attack);
    console.log('Kick sweep:', kick.sweep);
    console.log('Kick level:', kick.level);
  });
}

console.log('\n--- Browser stays open. Ctrl+C to exit ---');
await page.waitForTimeout(60000);
await browser.close();
