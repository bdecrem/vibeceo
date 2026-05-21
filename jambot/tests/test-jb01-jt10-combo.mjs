/**
 * Test: JB01 kick + JT10 bass combo
 * Verifies both instruments render audibly in a combined mix.
 *
 * Run: node jambot/tests/test-jb01-jt10-combo.mjs
 */
import { createHeadless } from '../headless.js';
import { readFileSync } from 'fs';

const jb = await createHeadless({ bpm: 124, outputDir: '.' });

// JB01: four-on-the-floor kick
await jb.tool('add_jb01', { kick: [0, 4, 8, 12] });
await jb.tool('tweak_jb01', { voice: 'kick', decay: 60, attack: 50, tune: -2 });

// JT10: simple bass line — C2 root with G2 on beat 3
await jb.tool('add_jt10', { pattern: [
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'E2', gate: true, accent: false, slide: false },
  { note: 'E2', gate: false, accent: false, slide: false },
  { note: 'E2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: true, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'G2', gate: true, accent: false, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'C2', gate: true, accent: false, slide: true },
  { note: 'C2', gate: true, accent: true, slide: false },
]});

// Pull JT10 back 10dB below kick (kick at 0dB, bass at -10dB)
await jb.tool('tweak_jt10', { level: -10, filterCutoff: 1000, filterEnvAmount: 60 });

// Render 4 bars
const output = 'jb01-jt10-combo';
const result = await jb.render(output, 4);
console.log(result);

// Verify both instruments are present
const buf = readFileSync(`./${output}.wav`);
const data = new Int16Array(buf.buffer, 44);
const sampleRate = 44100;
const stepDur = 60 / 124 / 4;

// Check peaks at kick positions (should have kick transient energy)
const kickSteps = [0, 4, 8, 12];
let kickPeakSum = 0;
for (const step of kickSteps) {
  const start = Math.floor(step * stepDur * sampleRate) * 2;
  let peak = 0;
  for (let i = start; i < Math.min(start + 1000, data.length); i++) {
    peak = Math.max(peak, Math.abs(data[i]));
  }
  kickPeakSum += peak;
}
const avgKickPeak = kickPeakSum / kickSteps.length;

// Check that bass has energy between kicks (step 2 = no kick, just bass)
const bassStart = Math.floor(2 * stepDur * sampleRate) * 2;
let bassPeak = 0;
for (let i = bassStart; i < Math.min(bassStart + 2000, data.length); i++) {
  bassPeak = Math.max(bassPeak, Math.abs(data[i]));
}

const pass = avgKickPeak > 3000 && bassPeak > 1000;
console.log(`Kick avg peak: ${avgKickPeak.toFixed(0)} (need >3000)`);
console.log(`Bass peak at step 2: ${bassPeak} (need >1000)`);
console.log(pass ? '✓ PASS — both kick and bass audible' : '✗ FAIL — missing instrument');

if (!pass) process.exit(1);
