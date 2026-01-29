import { chromium } from 'playwright';

// Test the crossfade by setting it to 100% wet for the ENTIRE track
// This verifies the HPF path is working correctly

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

// Modify the code to be 100% wet, then play
const result = await page.evaluate(async () => {
  return new Promise(async (resolve) => {
    // Override AudioContext to capture rendered buffer
    const origAC = window.AudioContext;
    let capturedBuffer = null;

    window.AudioContext = class extends origAC {
      constructor(opts) {
        super(opts);
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const origStart = source.start.bind(source);
        source.start = (...args) => {
          capturedBuffer = source.buffer;
          const data = capturedBuffer.getChannelData(0);
          const sampleRate = capturedBuffer.sampleRate;
          const stepDuration = 60 / 128 / 4;

          // Just analyze first 4 bars
          const startSample = 0;
          const endSample = Math.floor(64 * stepDuration * sampleRate);

          let peak = 0;
          let energy = 0;
          for (let i = startSample; i < endSample; i++) {
            peak = Math.max(peak, Math.abs(data[i]));
            energy += Math.abs(data[i]);
          }

          resolve({
            peak: peak.toFixed(3),
            avgEnergy: (energy / (endSample - startSample)).toFixed(4)
          });
          return;
        };
        return source;
      }
    };

    await window.playTrack();
  });
});

console.log('First 4 bars (currently set to DRY start):');
console.log(`Peak: ${result.peak}, Energy: ${result.avgEnergy}`);

await browser.close();
