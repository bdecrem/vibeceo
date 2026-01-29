import { chromium } from 'playwright';

// Test: set wet path to very low gain - wet kicks should be nearly silent

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

// Inject override to make wet path very quiet
const result = await page.evaluate(async () => {
  return new Promise(async (resolve) => {
    // Override OfflineAudioContext to modify the wet gain
    const origOAC = window.OfflineAudioContext;
    let gainCount = 0;

    window.OfflineAudioContext = class extends origOAC {
      constructor(...args) {
        super(...args);
        const origSetValueAtTime = AudioParam.prototype.setValueAtTime;
        const origLinearRamp = AudioParam.prototype.linearRampToValueAtTime;

        // Intercept gain automation to make wet very quiet
        AudioParam.prototype.setValueAtTime = function(value, time) {
          // If this is setting to 1.0 and is for kickWet, reduce it
          // We track by assuming kickWet is the 3rd gain created
          return origSetValueAtTime.call(this, value, time);
        };

        const origCreateGain = this.createGain.bind(this);
        this.createGain = () => {
          const gain = origCreateGain();
          gainCount++;
          // 3rd gain is kickWet - make it very quiet
          if (gainCount === 3) {
            const origSetVal = gain.gain.setValueAtTime.bind(gain.gain);
            const origRamp = gain.gain.linearRampToValueAtTime.bind(gain.gain);

            gain.gain.setValueAtTime = (value, time) => {
              // When trying to set to 1.0, set to 0.01 instead (very quiet)
              const newVal = value >= 0.9 ? 0.01 : value;
              return origSetVal(newVal, time);
            };
            gain.gain.linearRampToValueAtTime = (value, time) => {
              const newVal = value >= 0.9 ? 0.01 : value;
              return origRamp(newVal, time);
            };
          }
          return gain;
        };
      }
    };

    // Capture the audio
    const origAC = window.AudioContext;
    window.AudioContext = class extends origAC {
      constructor(opts) { super(opts); }
      createBufferSource() {
        const source = super.createBufferSource();
        const origStart = source.start.bind(source);
        source.start = (...args) => {
          const buffer = source.buffer;
          const data = buffer.getChannelData(0);
          const sampleRate = buffer.sampleRate;
          const stepDuration = 60 / 128 / 4;

          const getKickEnergy = (step) => {
            const kickTime = step * stepDuration;
            const startSample = Math.floor(kickTime * sampleRate);
            const endSample = Math.floor((kickTime + 0.1) * sampleRate);
            let rms = 0;
            for (let i = startSample; i < endSample && i < data.length; i++) {
              rms += data[i] * data[i];
            }
            return Math.sqrt(rms / (endSample - startSample));
          };

          const kicks = [
            { step: 0, expected: 'dry', rms: getKickEnergy(0) },
            { step: 16, expected: 'dry', rms: getKickEnergy(16) },
            { step: 64, expected: 'WET (quiet)', rms: getKickEnergy(64) },
            { step: 80, expected: 'WET (quiet)', rms: getKickEnergy(80) },
            { step: 96, expected: 'dry', rms: getKickEnergy(96) },
          ];

          resolve({ kicks });
          return;
        };
        return source;
      }
    };

    await window.playTrack();
  });
});

console.log('Zero-gain test (wet kicks should be ~0):');
console.log('=========================================');
result.kicks.forEach(k => {
  console.log(`Step ${k.step} (${k.expected}): RMS=${k.rms.toFixed(4)}`);
});

const dryKicks = result.kicks.filter(k => k.expected === 'dry');
const wetKicks = result.kicks.filter(k => k.expected.includes('WET'));
const avgDry = dryKicks.reduce((a, k) => a + k.rms, 0) / dryKicks.length;
const avgWet = wetKicks.reduce((a, k) => a + k.rms, 0) / wetKicks.length;

console.log('');
console.log(`Avg dry RMS: ${avgDry.toFixed(4)}`);
console.log(`Avg wet RMS: ${avgWet.toFixed(4)}`);
console.log(`Ratio: ${(avgDry / avgWet).toFixed(2)}`);

if (avgDry / avgWet > 5) {
  console.log('✓ Crossfade IS working - wet kicks are nearly silent');
} else {
  console.log('✗ Crossfade might not be working correctly');
}

await browser.close();
