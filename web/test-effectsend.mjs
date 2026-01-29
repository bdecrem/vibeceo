import { chromium } from 'playwright';

// Test EffectSend step automation

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture console logs
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('Browser error:', msg.text());
  }
});

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

const result = await page.evaluate(async () => {
  return new Promise(async (resolve, reject) => {
    // Override AudioContext to capture rendered buffer
    const origAC = window.AudioContext;

    window.AudioContext = class extends origAC {
      constructor(opts) {
        super(opts);
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const origStart = source.start.bind(source);
        source.start = (...args) => {
          const buffer = source.buffer;
          const data = buffer.getChannelData(0);
          const sampleRate = buffer.sampleRate;
          const stepDuration = 60 / 128 / 4; // 128 BPM, 16th notes

          // Analyze specific kicks
          const getKickRMS = (step) => {
            const kickTime = step * stepDuration;
            const startSample = Math.floor(kickTime * sampleRate);
            const endSample = Math.floor((kickTime + 0.15) * sampleRate); // 150ms window

            let rms = 0;
            for (let i = startSample; i < endSample && i < data.length; i++) {
              rms += data[i] * data[i];
            }
            return Math.sqrt(rms / (endSample - startSample));
          };

          const kicks = [
            // Dry sections (HPF off)
            { step: 0, expected: 'DRY', rms: getKickRMS(0) },
            { step: 16, expected: 'DRY', rms: getKickRMS(16) },
            { step: 32, expected: 'DRY', rms: getKickRMS(32) },
            // Wet sections (HPF on - steps 64-96)
            { step: 64, expected: 'WET', rms: getKickRMS(64) },
            { step: 80, expected: 'WET', rms: getKickRMS(80) },
            // Back to dry (steps 96+)
            { step: 96, expected: 'DRY', rms: getKickRMS(96) },
            { step: 112, expected: 'DRY', rms: getKickRMS(112) },
            // Wet again (steps 208-240)
            { step: 208, expected: 'WET', rms: getKickRMS(208) },
            { step: 224, expected: 'WET', rms: getKickRMS(224) },
            // Back to dry
            { step: 240, expected: 'DRY', rms: getKickRMS(240) },
          ];

          resolve({ kicks, duration: buffer.duration });
          return;
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

console.log('EffectSend Step Automation Test');
console.log('================================');
console.log(`Buffer duration: ${result.duration.toFixed(2)}s\n`);

result.kicks.forEach(k => {
  console.log(`Step ${k.step.toString().padStart(3)} (${k.expected}): RMS=${k.rms.toFixed(4)}`);
});

// Calculate averages
const dryKicks = result.kicks.filter(k => k.expected === 'DRY');
const wetKicks = result.kicks.filter(k => k.expected === 'WET');
const avgDry = dryKicks.reduce((a, k) => a + k.rms, 0) / dryKicks.length;
const avgWet = wetKicks.reduce((a, k) => a + k.rms, 0) / wetKicks.length;

console.log('');
console.log(`Avg DRY RMS: ${avgDry.toFixed(4)}`);
console.log(`Avg WET RMS: ${avgWet.toFixed(4)}`);
console.log(`Ratio (dry/wet): ${(avgDry / avgWet).toFixed(2)}`);

if (avgDry / avgWet > 1.3) {
  console.log('\n✓ SUCCESS: HPF automation is working! Dry sections have more low-end.');
} else if (avgDry / avgWet > 1.1) {
  console.log('\n⚠ PARTIAL: Some difference detected, but may need adjustment.');
} else {
  console.log('\n✗ FAIL: No significant difference - automation may not be working.');
}

await browser.close();
