import { chromium } from 'playwright';

// Analyze low-frequency energy specifically

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

const result = await page.evaluate(async () => {
  return new Promise(async (resolve, reject) => {
    const origAC = window.AudioContext;

    window.AudioContext = class extends origAC {
      constructor(opts) { super(opts); }
      createBufferSource() {
        const source = super.createBufferSource();
        source.start = (...args) => {
          const buffer = source.buffer;
          const data = buffer.getChannelData(0);
          const sampleRate = buffer.sampleRate;
          const stepDuration = 60 / 128 / 4;

          // Simple low-pass filter to isolate sub frequencies
          // Moving average over ~200 samples (for ~220Hz cutoff at 44.1k)
          const windowSize = 200;
          const lowPassData = new Float32Array(data.length);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i];
            if (i >= windowSize) sum -= data[i - windowSize];
            lowPassData[i] = sum / Math.min(i + 1, windowSize);
          }

          // Analyze kicks with low-passed signal
          const getKickLowEnergy = (step) => {
            const kickTime = step * stepDuration;
            const startSample = Math.floor(kickTime * sampleRate);
            const endSample = Math.floor((kickTime + 0.15) * sampleRate);

            let peak = 0;
            for (let i = startSample; i < endSample && i < lowPassData.length; i++) {
              peak = Math.max(peak, Math.abs(lowPassData[i]));
            }
            return peak;
          };

          const bars = [];
          for (let bar = 0; bar < 4; bar++) {
            const step = bar * 16;
            bars.push({
              bar: bar + 1,
              expected: bar % 2 === 0 ? 'DRY' : 'WET',
              lowPeak: getKickLowEnergy(step)
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

console.log('Low-Frequency Energy Test (sub-bass)');
console.log('====================================');

result.bars.forEach(b => {
  const marker = b.expected === 'DRY' ? '🔊' : '🔇';
  console.log(`Bar ${b.bar} (${b.expected}): Low Peak=${b.lowPeak.toFixed(4)} ${marker}`);
});

const dryBars = result.bars.filter(b => b.expected === 'DRY');
const wetBars = result.bars.filter(b => b.expected === 'WET');
const avgDry = dryBars.reduce((a, b) => a + b.lowPeak, 0) / dryBars.length;
const avgWet = wetBars.reduce((a, b) => a + b.lowPeak, 0) / wetBars.length;

console.log('');
console.log(`Avg DRY low peak: ${avgDry.toFixed(4)}`);
console.log(`Avg WET low peak: ${avgWet.toFixed(4)}`);
console.log(`Ratio: ${(avgDry / avgWet).toFixed(2)}x`);

if (avgDry / avgWet > 2) {
  console.log('\n✓ HPF is definitely cutting sub frequencies!');
} else if (avgDry / avgWet > 1.3) {
  console.log('\n⚠ Some low-freq difference, but might need more aggressive filter.');
} else {
  console.log('\n✗ HPF not working or automation not switching.');
}

await browser.close();
