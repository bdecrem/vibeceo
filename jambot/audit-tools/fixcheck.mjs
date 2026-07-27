import { createHeadless } from '/Users/bartdecrem/Documents/coding2025/vibeceo/jambot/headless.js';
const OUT = '/private/tmp/claude-501/-Users-bartdecrem-Documents-coding2025-hilma/9a88ecd8-cb32-4f5b-a35e-ecd209a3961e/scratchpad/fixcheck';
const acid = Array.from({length:16}, (_,i) => ({ note: 'A1', gate: true, accent: i%4===0, slide: i%8===5 }));

let jb = await createHeadless({ bpm: 130 });
await jb.tool('add_jb202', { pattern: acid });
await jb.tool('tweak_jb202', { filterCutoff: 400, filterResonance: 85, filterEnvAmount: 100 }).catch(async e => {
  await jb.tool('tweak', { path: 'jb202.filterCutoff', value: 400 });
  await jb.tool('tweak', { path: 'jb202.filterResonance', value: 85 });
  await jb.tool('tweak', { path: 'jb202.filterEnvAmount', value: 100 });
});
await jb.render(OUT + '-jb202-extreme', 4);

jb = await createHeadless({ bpm: 130 });
await jb.tool('add_jt10', { pattern: acid.map(s => ({...s, note: 'A2'})) }).catch(e => console.log('jt10 add err', e.message));
await jb.tool('tweak_jt10', { filterCutoff: 12000, filterResonance: 100, filterEnvAmount: 0 }).catch(async e => {
  await jb.tool('tweak', { path: 'jt10.cutoff', value: 12000 }).catch(()=>{});
  await jb.tool('tweak', { path: 'jt10.resonance', value: 100 }).catch(()=>{});
});
await jb.render(OUT + '-jt10-static-hi', 4);

jb = await createHeadless({ bpm: 130 });
await jb.tool('add_jt30', { pattern: acid });
await jb.tool('tweak_jt30', { filterCutoff: 2500, filterResonance: 100, filterEnvAmount: 100, accentLevel: 100, drive: 40 });
await jb.render(OUT + '-jt30-maxed', 4);

jb = await createHeadless({ bpm: 130 });
await jb.tool('load_jp9000_rig', { name: 'basic' }).catch(e => console.log('rig err:', e.message));
await jb.tool('add_jp9000_pattern', { pattern: Array.from({length:16}, (_,i) => ({ note: 'A2', gate: i%2===0, accent: i%4===0, velocity: 1 })) }).catch(e => console.log('pat err', e.message));
await jb.render(OUT + '-jp9000-basic', 4);
console.log('renders done');
process.exit(0);
