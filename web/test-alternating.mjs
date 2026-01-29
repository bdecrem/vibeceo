import { chromium } from 'playwright';

// Test alternating bar pattern: bar 1 dry, bar 2 wet, etc.

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('Browser error:', msg.text());
  }
});

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

const result = await page.evaluate(async () => {
  return new Promise(async (resolve, reject) => {
    const origAC = window.AudioContext;

    window.AudioContext = class extends origAC {
      constructor(opts) {
        super(opts);
      }
      createBufferSource() {
        const source = super.createBufferSource();
        source.start = (...args) => {
          const buffer = source.buffer;
          const data = buffer.getChannelData(0);
          const sampleRate = buffer.sampleRate;
          const stepDuration = 60 / 128 / 4;

          // Analyze first kick of each bar (step 0, 16, 32, 48...)
          const bars = [];
          for (let bar = 0; bar < 8; bar++) {
            const step = bar * 16; // First step of each bar
            const kickTime = step * stepDuration;
            const startSample = Math.floor(kickTime * sampleRate);
            const endSample = Math.floor((kickTime + 0.15) * sampleRate);

            let rms = 0;
            for (let i = startSample; i < endSample && i < data.length; i++) {
              rms += data[i] * data[i];
            }
            rms = Math.sqrt(rms / (endSample - startSample));

            bars.push({
              bar: bar + 1,
              expected: bar % 2 === 0 ? 'DRY' : 'WET',
              rms
            });
          }

          resolve({ bars });
        };
        return source;
      }
    };

    try {
      await window.playTrack();
    } catch (err) {
      reject(err);
    }
  });
});

console.log('Alternating Bar Pattern Test');
console.log('============================');
console.log('Pattern: DRY-WET-DRY-WET-DRY-WET-DRY-WET\n');

result.bars.forEach(b => {
  const marker = b.expected === 'DRY' ? '🔊' : '🔇';
  console.log(`Bar ${b.bar} (${b.expected}): RMS=${b.rms.toFixed(4)} ${marker}`);
});

const dryBars = result.bars.filter(b => b.expected === 'DRY');
const wetBars = result.bars.filter(b => b.expected === 'WET');
const avgDry = dryBars.reduce((a, b) => a + b.rms, 0) / dryBars.length;
const avgWet = wetBars.reduce((a, b) => a + b.rms, 0) / wetBars.length;

console.log('');
console.log(`Avg DRY: ${avgDry.toFixed(4)}`);
console.log(`Avg WET: ${avgWet.toFixed(4)}`);
console.log(`Ratio: ${(avgDry / avgWet).toFixed(2)}x`);

if (avgDry / avgWet > 1.15) {
  console.log('\n✓ Alternating pattern is working!');
} else {
  console.log('\n✗ Pattern may not be working correctly.');
}

await browser.close();
