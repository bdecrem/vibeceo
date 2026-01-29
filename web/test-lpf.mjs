import { chromium } from 'playwright';

// Test the master LPF using FFT-like analysis

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') console.log('Error:', msg.text());
});

await page.goto('http://localhost:3000/909/new-moon-ritual.html');
await page.waitForLoadState('networkidle');

console.log('Testing Master LPF with frequency band analysis...\n');

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

          // Analyze a hat-heavy section (bar 3, "the gathering")
          const stepDuration = 60 / 105 / 4;
          const analysisStart = 2 * 16 * stepDuration;
          const startSample = Math.floor(analysisStart * sampleRate);
          const windowSize = Math.floor(0.5 * sampleRate); // 500ms window

          // Simple frequency band energy using zero-crossing rate and derivative energy
          let zeroCrossings = 0;
          let lowEnergy = 0;   // Approximated by smoothed signal
          let highEnergy = 0;  // Approximated by high-pass (difference)
          let totalEnergy = 0;

          // Moving average for low frequency approximation
          const smoothWindow = 50; // ~880Hz cutoff at 44.1k
          let smoothSum = 0;

          for (let i = startSample; i < startSample + windowSize && i < data.length - 1; i++) {
            // Total energy
            totalEnergy += data[i] * data[i];

            // Zero crossings (indicates high frequency content)
            if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
              zeroCrossings++;
            }

            // High frequency energy (derivative)
            const diff = data[i + 1] - data[i];
            highEnergy += diff * diff;

            // Low frequency energy (smoothed)
            smoothSum += data[i];
            if (i >= startSample + smoothWindow) {
              smoothSum -= data[i - smoothWindow];
            }
            const smoothed = smoothSum / Math.min(i - startSample + 1, smoothWindow);
            lowEnergy += smoothed * smoothed;
          }

          const avgZeroCrossRate = zeroCrossings / (windowSize / sampleRate); // per second

          resolve({
            zeroCrossingRate: avgZeroCrossRate,
            highEnergy: Math.sqrt(highEnergy / windowSize),
            lowEnergy: Math.sqrt(lowEnergy / windowSize),
            totalRMS: Math.sqrt(totalEnergy / windowSize),
            highToLowRatio: highEnergy / (lowEnergy + 0.0001)
          });
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

console.log('With LPF (4.5kHz 2-stage):');
console.log(`  Zero-crossing rate: ${result.zeroCrossingRate.toFixed(0)} Hz`);
console.log(`  High-freq energy: ${result.highEnergy.toFixed(6)}`);
console.log(`  Low-freq energy: ${result.lowEnergy.toFixed(6)}`);
console.log(`  Total RMS: ${result.totalRMS.toFixed(4)}`);
console.log(`  High/Low ratio: ${result.highToLowRatio.toFixed(4)}`);

// Now test with LPF bypassed
await page.reload();
await page.waitForLoadState('networkidle');

const resultBypass = await page.evaluate(async () => {
  // Bypass the LPF by setting cutoff to 20kHz
  const origOAC = window.OfflineAudioContext;
  window.OfflineAudioContext = class extends origOAC {
    constructor(...args) {
      super(...args);
      const origCreateBiquad = this.createBiquadFilter.bind(this);
      let lpfCount = 0;
      this.createBiquadFilter = () => {
        const filter = origCreateBiquad();
        // Intercept type setter to catch LPFs
        let realType = 'lowpass';
        Object.defineProperty(filter, 'type', {
          get() { return realType; },
          set(val) {
            realType = val;
            if (val === 'lowpass') {
              lpfCount++;
              // Bypass LPFs 1 and 2 (the master chain)
              if (lpfCount <= 2) {
                filter.frequency.value = 20000;
                console.log(`Bypassed LPF ${lpfCount}`);
              }
            }
          }
        });
        return filter;
      };
    }
  };

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

          const stepDuration = 60 / 105 / 4;
          const analysisStart = 2 * 16 * stepDuration;
          const startSample = Math.floor(analysisStart * sampleRate);
          const windowSize = Math.floor(0.5 * sampleRate);

          let zeroCrossings = 0;
          let lowEnergy = 0;
          let highEnergy = 0;
          let totalEnergy = 0;
          const smoothWindow = 50;
          let smoothSum = 0;

          for (let i = startSample; i < startSample + windowSize && i < data.length - 1; i++) {
            totalEnergy += data[i] * data[i];
            if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
              zeroCrossings++;
            }
            const diff = data[i + 1] - data[i];
            highEnergy += diff * diff;
            smoothSum += data[i];
            if (i >= startSample + smoothWindow) smoothSum -= data[i - smoothWindow];
            const smoothed = smoothSum / Math.min(i - startSample + 1, smoothWindow);
            lowEnergy += smoothed * smoothed;
          }

          resolve({
            zeroCrossingRate: zeroCrossings / (windowSize / sampleRate),
            highEnergy: Math.sqrt(highEnergy / windowSize),
            lowEnergy: Math.sqrt(lowEnergy / windowSize),
            totalRMS: Math.sqrt(totalEnergy / windowSize),
            highToLowRatio: highEnergy / (lowEnergy + 0.0001)
          });
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

console.log('\nWithout LPF (bypassed):');
console.log(`  Zero-crossing rate: ${resultBypass.zeroCrossingRate.toFixed(0)} Hz`);
console.log(`  High-freq energy: ${resultBypass.highEnergy.toFixed(6)}`);
console.log(`  Low-freq energy: ${resultBypass.lowEnergy.toFixed(6)}`);
console.log(`  Total RMS: ${resultBypass.totalRMS.toFixed(4)}`);
console.log(`  High/Low ratio: ${resultBypass.highToLowRatio.toFixed(4)}`);

console.log('\n--- Comparison ---');
const zcrReduction = ((resultBypass.zeroCrossingRate - result.zeroCrossingRate) / resultBypass.zeroCrossingRate) * 100;
const hfReduction = ((resultBypass.highEnergy - result.highEnergy) / resultBypass.highEnergy) * 100;
const ratioReduction = ((resultBypass.highToLowRatio - result.highToLowRatio) / resultBypass.highToLowRatio) * 100;

console.log(`Zero-crossing reduction: ${zcrReduction.toFixed(1)}%`);
console.log(`High-freq energy reduction: ${hfReduction.toFixed(1)}%`);
console.log(`High/Low ratio reduction: ${ratioReduction.toFixed(1)}%`);

if (hfReduction > 15 || zcrReduction > 10) {
  console.log('\n✓ LPF is working');
} else {
  console.log('\n✗ LPF not effective - need to debug routing');
}

await browser.close();
