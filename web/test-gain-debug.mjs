import { chromium } from 'playwright';

// Debug test - check if gain values are actually changing

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log('Browser:', msg.text()));

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

const result = await page.evaluate(async () => {
  return new Promise(async (resolve, reject) => {
    // Intercept OfflineAudioContext to capture gain nodes
    const origOAC = window.OfflineAudioContext;
    let dryGain = null;
    let wetGain = null;
    let gainCount = 0;

    window.OfflineAudioContext = class extends origOAC {
      constructor(...args) {
        super(...args);
        const origCreateGain = this.createGain.bind(this);
        this.createGain = () => {
          const gain = origCreateGain();
          gainCount++;
          // EffectSend creates: _input (1), _output (2), _dryGain (3), _wetGain (4)
          if (gainCount === 3) {
            dryGain = gain;
            console.log('Captured dryGain');
          }
          if (gainCount === 4) {
            wetGain = gain;
            console.log('Captured wetGain');
          }
          return gain;
        };
      }
    };

    const origAC = window.AudioContext;
    window.AudioContext = class extends origAC {
      constructor(opts) { super(opts); }
      createBufferSource() {
        const source = super.createBufferSource();
        source.start = (...args) => {
          // Check the gain automation
          const results = {
            dryGainValue: dryGain?.gain?.value,
            wetGainValue: wetGain?.gain?.value,
            gainCount,
          };

          // Check scheduled automation events
          // We can't directly read automation, but we can check the pattern

          resolve(results);
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

console.log('\nGain Debug Results:');
console.log('===================');
console.log(`Total gains created: ${result.gainCount}`);
console.log(`Dry gain value: ${result.dryGainValue}`);
console.log(`Wet gain value: ${result.wetGainValue}`);

await browser.close();
