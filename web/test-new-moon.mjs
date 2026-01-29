import { chromium } from 'playwright';

// Quick sanity check for New Moon Ritual v2

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:3000/909/new-moon-ritual.html');
await page.waitForLoadState('networkidle');

console.log('Testing New Moon Ritual v2...\n');

const result = await page.evaluate(async () => {
  return new Promise(async (resolve, reject) => {
    const origAC = window.AudioContext;

    window.AudioContext = class extends origAC {
      constructor(opts) { super(opts); }
      createBufferSource() {
        const source = super.createBufferSource();
        source.start = (...args) => {
          const buffer = source.buffer;
          resolve({
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            channels: buffer.numberOfChannels,
            success: true
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

console.log(`Duration: ${result.duration.toFixed(2)}s (expected ~19.3s for 8 bars @ 105 BPM)`);
console.log(`Sample rate: ${result.sampleRate}`);
console.log(`Channels: ${result.channels}`);

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log('  ' + e));
} else {
  console.log('\n✓ No console errors');
}

if (result.success && result.duration > 18 && result.duration < 21) {
  console.log('✓ Track rendered successfully');
} else {
  console.log('✗ Unexpected duration');
}

await browser.close();
