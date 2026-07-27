// JT30 shrillness harness: renders 4 test cases + runs jambot detect_resonance on each.
// Usage: cd vibeceo/jambot && node jt30-harness.mjs <tag>
import { createHeadless } from '/Users/bartdecrem/Documents/coding2025/vibeceo/jambot/headless.js';
const tag = process.argv[2] || 'baseline';
const OUT = '/private/tmp/claude-501/-Users-bartdecrem-Documents-coding2025-hilma/9a88ecd8-cb32-4f5b-a35e-ecd209a3961e/scratchpad/harness';

const acidLine = Array.from({length:16}, (_,i) => ({
  note: ['A1','A1','A2','A1','C2','A1','D2','E2','A1','A1','G2','A1','C2','D2','A1','E1'][i],
  gate: [1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1][i] === 1,
  accent: [1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0][i] === 1,
  slide: [0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0][i] === 1,
}));

const cases = [
  { name: 'squelch-res80', params: { level: 70, filterCutoff: 400, filterResonance: 80, filterEnvAmount: 70, filterDecay: 50, accentLevel: 85, drive: 25 },
    auto: { path: 'jt30.bass.cutoff', values: Array.from({length:64}, (_,i) => 200 + i * 35) } },
  { name: 'default-res45', params: { level: 70, filterCutoff: 400, filterResonance: 45, filterEnvAmount: 70, filterDecay: 50, accentLevel: 85, drive: 25 }, auto: null },
  { name: 'buried-texture', params: { level: 70, filterCutoff: 250, filterResonance: 75, filterEnvAmount: 40, filterDecay: 35, accentLevel: 70, drive: 20 }, auto: null },
  { name: 'squelch-track', params: { level: 70, filterCutoff: 200, filterResonance: 75, filterEnvAmount: 55, filterDecay: 45, accentLevel: 80, drive: 25 },
    auto: { path: 'jt30.bass.cutoff', values: Array.from({length:64}, (_,i) => 200 * Math.pow(2000/200, i/63)) } },
];

for (const c of cases) {
  const jb = await createHeadless({ bpm: 130 });
  await jb.tool('add_jt30', { pattern: acidLine });
  await jb.tool('tweak_jt30', c.params);
  if (c.auto) await jb.tool('automate', c.auto);
  const wav = `${OUT}-${tag}-${c.name}`;
  await jb.render(wav, 4);
  const res = await jb.tool('detect_resonance', { filename: wav + '.wav', minProminence: 12 });
  console.log(`\n### ${c.name} [${tag}]`);
  console.log(String(res).split('\n').slice(0, 12).join('\n'));
}
console.log('\nHARNESS DONE');
process.exit(0);
