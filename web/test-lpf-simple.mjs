import { chromium } from 'playwright';

// Simple test - just analyze output with 1kHz LPF

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/new-moon-ritual.html');
await page.waitForLoadState('networkidle');

console.log('Testing with 1kHz LPF (should sound very muffled)...\n');

const result = await page.evaluate(async () => {
  return new Promise(async (resolve, reject) => {
    const origAC = window.AudioContext;

    window.AudioContext = class extends origAC {
      constructor(opts) { super(opts); }
      createBufferSource() {
        const source = super.createBufferSource();
        source.start = () => {
          const buffer = source.buffer;
          const data = buffer.getChannelData(0);
          const sampleRate = buffer.sampleRate;

          // Analyze full buffer
          let zeroCrossings = 0;
          let highEnergy = 0;
          let totalEnergy = 0;

          for (let i = 1000; i < data.length - 1; i++) {
            totalEnergy += data[i] * data[i];
            if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
              zeroCrossings++;
            }
            const diff = data[i + 1] - data[i];
            highEnergy += diff * diff;
          }

          const duration = data.length / sampleRate;
          resolve({
            zeroCrossingRate: zeroCrossings / duration,
            highEnergy: Math.sqrt(highEnergy / data.length),
            totalRMS: Math.sqrt(totalEnergy / data.length),
            duration
          });
        };
        return source;
      }
    };

    await window.playTrack();
  });
});

console.log(`Duration: ${result.duration.toFixed(2)}s`);
console.log(`Zero-crossing rate: ${result.zeroCrossingRate.toFixed(0)} Hz`);
console.log(`High-freq energy: ${result.highEnergy.toFixed(6)}`);
console.log(`Total RMS: ${result.totalRMS.toFixed(4)}`);

// For reference: unfiltered 909 hats typically have ZCR > 5000Hz
// With 1kHz LPF, should be < 500Hz
if (result.zeroCrossingRate < 500) {
  console.log('\n✓ LPF appears to be working (low ZCR indicates filtered highs)');
} else if (result.zeroCrossingRate < 2000) {
  console.log('\n⚠ Some filtering but not as aggressive as expected');
} else {
  console.log('\n✗ LPF not working - ZCR too high for 1kHz cutoff');
}

await browser.close();
