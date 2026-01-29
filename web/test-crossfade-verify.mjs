import { chromium } from 'playwright';

// Create a minimal test page that ONLY tests the crossfade mechanism
// No complexity - just dry vs wet path

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Create a test that renders two separate buffers: one dry, one wet
const result = await page.evaluate(async () => {
  const sampleRate = 44100;
  const duration = 1; // 1 second

  async function renderKick(useHPF) {
    const ctx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

    // Simple sine kick at 55Hz
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;

    const env = ctx.createGain();
    env.gain.setValueAtTime(1, 0);
    env.gain.exponentialRampToValueAtTime(0.001, 0.5);

    osc.connect(env);

    if (useHPF) {
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 800;
      hpf.Q.value = 1.5;
      env.connect(hpf);
      hpf.connect(ctx.destination);
    } else {
      env.connect(ctx.destination);
    }

    osc.start(0);
    osc.stop(0.5);

    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);

    let peak = 0;
    let energy = 0;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
      energy += Math.abs(data[i]);
    }

    return { peak, energy: energy / data.length };
  }

  const dryResult = await renderKick(false);
  const wetResult = await renderKick(true);

  return { dry: dryResult, wet: wetResult };
});

console.log('Isolated HPF test (55Hz sine):');
console.log(`DRY: peak=${result.dry.peak.toFixed(4)}, energy=${result.dry.energy.toFixed(4)}`);
console.log(`WET: peak=${result.wet.peak.toFixed(4)}, energy=${result.wet.energy.toFixed(4)}`);
console.log(`Ratio (dry/wet): ${(result.dry.peak / result.wet.peak).toFixed(2)}`);

if (result.dry.peak / result.wet.peak > 5) {
  console.log('✓ HPF is working correctly - 800Hz filter removes most of 55Hz sine');
} else {
  console.log('✗ HPF not effective enough');
}

await browser.close();
