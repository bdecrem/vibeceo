import { chromium } from 'playwright';

// Check if the first kick in bar 1 vs bar 2 has different waveform shape

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

const result = await page.evaluate(async () => {
  return new Promise(async (resolve) => {
    const origAC = window.AudioContext;
    window.AudioContext = class extends origAC {
      constructor(opts) { super(opts); }
      createBufferSource() {
        const source = super.createBufferSource();
        source.start = () => {
          const data = source.buffer.getChannelData(0);
          const sampleRate = source.buffer.sampleRate;
          const stepDuration = 60 / 128 / 4;

          // Get first 1000 samples of kick in bar 1 (step 0) and bar 2 (step 16)
          const getKickSamples = (step) => {
            const kickTime = step * stepDuration;
            const startSample = Math.floor(kickTime * sampleRate);
            const samples = [];
            for (let i = 0; i < 1000 && startSample + i < data.length; i++) {
              samples.push(data[startSample + i]);
            }
            return samples;
          };

          const bar1Kick = getKickSamples(0);  // Should be DRY
          const bar2Kick = getKickSamples(16); // Should be WET (HPF)

          // Calculate RMS for first 500 samples (initial transient)
          const rmsFirst = (samples) => {
            let sum = 0;
            for (let i = 0; i < 500; i++) sum += samples[i] * samples[i];
            return Math.sqrt(sum / 500);
          };

          // Calculate RMS for samples 500-1000 (body)
          const rmsBody = (samples) => {
            let sum = 0;
            for (let i = 500; i < 1000; i++) sum += samples[i] * samples[i];
            return Math.sqrt(sum / 500);
          };

          resolve({
            bar1: {
              firstRms: rmsFirst(bar1Kick),
              bodyRms: rmsBody(bar1Kick),
              peak: Math.max(...bar1Kick.map(Math.abs))
            },
            bar2: {
              firstRms: rmsFirst(bar2Kick),
              bodyRms: rmsBody(bar2Kick),
              peak: Math.max(...bar2Kick.map(Math.abs))
            }
          });
        };
        return source;
      }
    };
    await window.playTrack();
  });
});

console.log('Kick Waveform Comparison');
console.log('========================');
console.log('');
console.log('Bar 1 (DRY):');
console.log(`  First 500 samples RMS: ${result.bar1.firstRms.toFixed(4)}`);
console.log(`  Body 500-1000 RMS:     ${result.bar1.bodyRms.toFixed(4)}`);
console.log(`  Peak:                   ${result.bar1.peak.toFixed(4)}`);
console.log('');
console.log('Bar 2 (WET - should be HPF):');
console.log(`  First 500 samples RMS: ${result.bar2.firstRms.toFixed(4)}`);
console.log(`  Body 500-1000 RMS:     ${result.bar2.bodyRms.toFixed(4)}`);
console.log(`  Peak:                   ${result.bar2.peak.toFixed(4)}`);
console.log('');
console.log('Ratios (Bar1/Bar2):');
console.log(`  First: ${(result.bar1.firstRms / result.bar2.firstRms).toFixed(2)}x`);
console.log(`  Body:  ${(result.bar1.bodyRms / result.bar2.bodyRms).toFixed(2)}x`);
console.log(`  Peak:  ${(result.bar1.peak / result.bar2.peak).toFixed(2)}x`);

await browser.close();
