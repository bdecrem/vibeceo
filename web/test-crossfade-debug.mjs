import { chromium } from 'playwright';

// Test crossfade by capturing gain values at specific times

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

// Inject code to expose gain nodes
const result = await page.evaluate(async () => {
  return new Promise(async (resolve) => {
    // Intercept OfflineAudioContext to grab gain references
    const origOAC = window.OfflineAudioContext;
    let dryGainNode = null;
    let wetGainNode = null;
    let gains = [];

    window.OfflineAudioContext = class extends origOAC {
      constructor(...args) {
        super(...args);
        const origCreateGain = this.createGain.bind(this);
        let gainCount = 0;
        this.createGain = () => {
          const gain = origCreateGain();
          gainCount++;
          // 2nd and 3rd gains created are kickDry and kickWet
          if (gainCount === 2) dryGainNode = gain;
          if (gainCount === 3) wetGainNode = gain;
          return gain;
        };
      }
    };

    // Override AudioContext to capture after render
    const origAC = window.AudioContext;
    window.AudioContext = class extends origAC {
      constructor(opts) {
        super(opts);
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const origStart = source.start.bind(source);
        source.start = (...args) => {
          // Check gain automation was set up
          if (dryGainNode && wetGainNode) {
            const stepDuration = 60 / 128 / 4;
            const times = [
              { name: 'bar1 (step 0)', time: 0 },
              { name: 'bar2 (step 16)', time: 16 * stepDuration },
              { name: 'bar4 (step 64) - should be WET', time: 64 * stepDuration },
              { name: 'bar5 (step 80) - should be WET', time: 80 * stepDuration },
              { name: 'bar7 (step 96) - should be DRY', time: 96 * stepDuration },
            ];

            // Can't read gain values after offline render, but we can check they exist
            gains = times.map(t => ({
              ...t,
              // Gain nodes have automation scheduled
              hasAutomation: true
            }));
          }

          // Analyze actual audio
          const buffer = source.buffer;
          const data = buffer.getChannelData(0);
          const sampleRate = buffer.sampleRate;
          const stepDuration = 60 / 128 / 4;

          // Check RMS energy in specific kicks
          const getKickEnergy = (step) => {
            const kickTime = step * stepDuration;
            const startSample = Math.floor(kickTime * sampleRate);
            const endSample = Math.floor((kickTime + 0.1) * sampleRate); // 100ms window

            let rms = 0;
            for (let i = startSample; i < endSample && i < data.length; i++) {
              rms += data[i] * data[i];
            }
            return Math.sqrt(rms / (endSample - startSample));
          };

          const kicks = [
            { step: 0, expected: 'dry', rms: getKickEnergy(0) },
            { step: 16, expected: 'dry', rms: getKickEnergy(16) },
            { step: 64, expected: 'WET', rms: getKickEnergy(64) },
            { step: 80, expected: 'WET', rms: getKickEnergy(80) },
            { step: 96, expected: 'dry', rms: getKickEnergy(96) },
            { step: 112, expected: 'dry', rms: getKickEnergy(112) },
          ];

          resolve({ gains, kicks });
          return;
        };
        return source;
      }
    };

    await window.playTrack();
  });
});

console.log('Crossfade Debug - Individual kick RMS:');
console.log('======================================');
result.kicks.forEach(k => {
  console.log(`Step ${k.step} (${k.expected}): RMS=${k.rms.toFixed(4)}`);
});

const dryKicks = result.kicks.filter(k => k.expected === 'dry');
const wetKicks = result.kicks.filter(k => k.expected === 'WET');
const avgDry = dryKicks.reduce((a, k) => a + k.rms, 0) / dryKicks.length;
const avgWet = wetKicks.reduce((a, k) => a + k.rms, 0) / wetKicks.length;

console.log('');
console.log(`Avg dry RMS: ${avgDry.toFixed(4)}`);
console.log(`Avg wet RMS: ${avgWet.toFixed(4)}`);
console.log(`Ratio: ${(avgDry / avgWet).toFixed(2)}`);

await browser.close();
