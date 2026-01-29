import { chromium } from 'playwright';

// Test with wetLevel=1 for ALL steps - should be dramatically different from dry

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

// First, get the normal (alternating) results
const normalResult = await page.evaluate(async () => {
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

          // Get first kick RMS
          const startSample = 0;
          const endSample = Math.floor(0.15 * sampleRate);
          let rms = 0;
          for (let i = startSample; i < endSample; i++) {
            rms += data[i] * data[i];
          }
          rms = Math.sqrt(rms / endSample);

          resolve({ rms, mode: 'alternating' });
        };
        return source;
      }
    };
    await window.playTrack();
  });
});

console.log(`Normal (alternating): Bar 1 RMS = ${normalResult.rms.toFixed(4)}`);

// Now modify the page to use 100% wet
await page.reload();
await page.waitForLoadState('networkidle');

const wetOnlyResult = await page.evaluate(async () => {
  // Patch the EffectSend to always be wet
  const origOAC = window.OfflineAudioContext;
  window.OfflineAudioContext = class extends origOAC {
    constructor(...args) {
      super(...args);
      const origCreateGain = this.createGain.bind(this);
      let gainCount = 0;
      this.createGain = () => {
        const gain = origCreateGain();
        gainCount++;
        // Set EffectSend's dryGain to 0 and wetGain to 1
        if (gainCount === 3) { // dryGain
          gain.gain.value = 0;
        }
        if (gainCount === 4) { // wetGain
          gain.gain.value = 1;
        }
        return gain;
      };
    }
  };

  return new Promise(async (resolve) => {
    const origAC = window.AudioContext;
    window.AudioContext = class extends origAC {
      constructor(opts) { super(opts); }
      createBufferSource() {
        const source = super.createBufferSource();
        source.start = () => {
          const data = source.buffer.getChannelData(0);
          const sampleRate = source.buffer.sampleRate;

          const endSample = Math.floor(0.15 * sampleRate);
          let rms = 0;
          for (let i = 0; i < endSample; i++) {
            rms += data[i] * data[i];
          }
          rms = Math.sqrt(rms / endSample);

          resolve({ rms, mode: 'wet-only' });
        };
        return source;
      }
    };
    await window.playTrack();
  });
});

console.log(`Wet-only (HPF always on): Bar 1 RMS = ${wetOnlyResult.rms.toFixed(4)}`);
console.log('');
console.log(`Ratio (normal/wet): ${(normalResult.rms / wetOnlyResult.rms).toFixed(2)}x`);

if (normalResult.rms / wetOnlyResult.rms > 1.5) {
  console.log('\n✓ HPF effect IS working - the wet path is definitely filtered');
} else {
  console.log('\n✗ HPF might not be working correctly');
}

await browser.close();
