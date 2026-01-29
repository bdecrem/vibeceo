import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/909/session-2.html');
await page.waitForLoadState('networkidle');

// Click play and capture audio
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
          // Analyze immediately
          const data = capturedBuffer.getChannelData(0);
          const sampleRate = capturedBuffer.sampleRate;
          const stepDuration = 60 / 128 / 4; // 128 BPM, 16th notes

          // Analyze kick energy at different sections
          const analyzeSection = (name, startStep, numSteps) => {
            const startSample = Math.floor(startStep * stepDuration * sampleRate);
            const endSample = Math.floor((startStep + numSteps) * stepDuration * sampleRate);

            let energy = 0;
            let peakLow = 0;  // Low freq energy (sub)

            // Simple low-pass approximation: average of samples (DC component)
            for (let i = startSample; i < endSample && i < data.length; i++) {
              energy += Math.abs(data[i]);
              // Crude low freq estimate: look at sample values magnitude
              if (Math.abs(data[i]) > 0.3) peakLow = Math.max(peakLow, Math.abs(data[i]));
            }

            return {
              name,
              steps: `${startStep}-${startStep + numSteps}`,
              avgEnergy: (energy / (endSample - startSample)).toFixed(4),
              peakAmp: peakLow.toFixed(3)
            };
          };

          const sections = [
            analyzeSection('bar1-dry', 0, 16),
            analyzeSection('bar2-dry', 16, 16),
            analyzeSection('bar4-wet', 64, 16),   // Should be HPF
            analyzeSection('bar5-wet', 80, 16),   // Should be HPF
            analyzeSection('bar7-dry', 96, 16),   // Back to dry
            analyzeSection('bar8-dry', 112, 16),  // Dry
            analyzeSection('bar14-wet', 208, 16), // Should be HPF after drop
            analyzeSection('bar16-dry', 240, 16), // Back to dry
          ];

          resolve({ sections, duration: capturedBuffer.duration });
          return;
        };
        return source;
      }
    };

    // Trigger playback
    await window.playTrack();
  });
});

console.log('Crossfade Analysis:');
console.log('==================');
result.sections.forEach(s => {
  const isWet = s.name.includes('wet');
  console.log(`${s.name}: energy=${s.avgEnergy}, peak=${s.peakAmp} ${isWet ? '(HPF - should be lower)' : '(DRY)'}`);
});

// Check if wet sections have noticeably lower peaks
const drySections = result.sections.filter(s => s.name.includes('dry'));
const wetSections = result.sections.filter(s => s.name.includes('wet'));
const avgDryPeak = drySections.reduce((a, s) => a + parseFloat(s.peakAmp), 0) / drySections.length;
const avgWetPeak = wetSections.reduce((a, s) => a + parseFloat(s.peakAmp), 0) / wetSections.length;

console.log('');
console.log(`Avg dry peak: ${avgDryPeak.toFixed(3)}`);
console.log(`Avg wet peak: ${avgWetPeak.toFixed(3)}`);
console.log(`Ratio (dry/wet): ${(avgDryPeak / avgWetPeak).toFixed(2)}`);

if (avgDryPeak / avgWetPeak > 1.3) {
  console.log('✓ HPF crossfade is working! Dry sections have more low-end.');
} else {
  console.log('✗ No significant difference - crossfade may not be working');
}

await browser.close();
