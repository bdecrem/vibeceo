/**
 * Drift — headless render + analysis
 * Mirrors the browser arrangement to verify levels, sections, transitions
 */
import { writeFileSync } from 'fs';
import { OfflineAudioContext } from 'node-web-audio-api';
import { JT10Engine } from '../web/public/jt10/dist/machines/jt10/engine.js';
import { JB01Engine } from '../web/public/jb01/dist/machines/jb01/engine.js';

const BPM = 118;
const STEP_DUR = 60 / BPM / 4;
const SAMPLE_RATE = 44100;
const TOTAL_BARS = 76;
const TOTAL_STEPS = TOTAL_BARS * 16;
const DURATION = TOTAL_STEPS * STEP_DUR + 8; // extra seconds for reverb tail

// ── ARRANGEMENT (mirrors browser version) ──

function getSection(step) {
  const bar = Math.floor(step / 16);
  if (bar < 16) return 'rise';
  if (bar < 24) return 'peak';
  if (bar < 40) return 'dissolve';
  if (bar < 56) return 'drift';
  if (bar < 64) return 'return';
  if (bar < 71) return 'kick';
  return 'fadeout';
}

function getNoteProbability(step) {
  const bar = Math.floor(step / 16);
  const section = getSection(step);
  if (section === 'rise') return 1.0;
  if (section === 'peak') return 1.0;
  if (section === 'dissolve') {
    return 1.0 - ((bar - 24) / 15) * 0.88;
  }
  if (section === 'drift') return 0.12;
  if (section === 'return') {
    return 0.12 + ((bar - 56) / 7) * 0.88;
  }
  if (section === 'kick') return 1.0;
  if (section === 'fadeout') {
    return 1.0 - ((bar - 71) / 4) * 0.5;
  }
  return 1.0;
}

function getCutoff(step) {
  const bar = Math.floor(step / 16);
  const section = getSection(step);
  if (section === 'rise') return 0.03 + (bar / 15) * 0.32;
  if (section === 'peak') return 0.35;
  if (section === 'dissolve') return 0.35 - ((bar - 24) / 15) * 0.20;
  if (section === 'drift') return 0.15;
  if (section === 'return') return 0.15 + ((bar - 56) / 7) * 0.20;
  if (section === 'kick') return 0.35;
  if (section === 'fadeout') return 0.35 - ((bar - 71) / 4) * 0.15;
  return 0.35;
}

function getReverbMix(step) {
  const bar = Math.floor(step / 16);
  const section = getSection(step);
  if (section === 'rise') {
    const p = bar / 15;
    return { wet: 0.10 + p * 0.55, dry: 0.80 - p * 0.40 };
  }
  if (section === 'peak') return { wet: 0.65, dry: 0.40 };
  if (section === 'dissolve') {
    const p = (bar - 24) / 15;
    return { wet: 0.65 + p * 0.25, dry: 0.40 - p * 0.20 };
  }
  if (section === 'drift') return { wet: 0.90, dry: 0.20 };
  if (section === 'return') {
    const p = (bar - 56) / 7;
    return { wet: 0.90 - p * 0.25, dry: 0.20 + p * 0.20 };
  }
  if (section === 'kick') return { wet: 0.45, dry: 0.55 };
  if (section === 'fadeout') return { wet: 0.50, dry: 0.50 };
  return { wet: 0.65, dry: 0.40 };
}

// Arp
const arpBase = [
  { note: 'A2',  gate: true,  accent: false, slide: false },
  { note: 'A2',  gate: false, accent: false, slide: false },
  { note: 'C3',  gate: true,  accent: false, slide: true  },
  { note: 'E3',  gate: true,  accent: true,  slide: false },
  { note: 'E3',  gate: false, accent: false, slide: false },
  { note: 'C3',  gate: true,  accent: false, slide: false },
  { note: 'A2',  gate: true,  accent: false, slide: true  },
  { note: 'A2',  gate: false, accent: false, slide: false },
  { note: 'A2',  gate: true,  accent: false, slide: false },
  { note: 'C3',  gate: true,  accent: false, slide: false },
  { note: 'E3',  gate: true,  accent: false, slide: true  },
  { note: 'A3',  gate: true,  accent: true,  slide: false },
  { note: 'A3',  gate: false, accent: false, slide: false },
  { note: 'E3',  gate: true,  accent: false, slide: true  },
  { note: 'C3',  gate: true,  accent: false, slide: false },
  { note: 'A2',  gate: true,  accent: false, slide: false },
];

const variations = [
  null, null,
  { step: 11, note: 'G3', slide: true },
  null,
  { step: 5,  note: 'D3', slide: false },
  null,
  { step: 3,  note: 'E2', slide: false },
  { step: 11, note: 'B3', slide: true },
  { step: 9,  note: 'D3', slide: true },
  null,
  { step: 3,  note: 'G3', slide: false },
  null,
  { step: 14, note: 'D3', slide: true },
  null,
  { step: 11, note: 'G3', slide: true },
  null,
  null,
  { step: 5,  note: 'D3', slide: false },
  null,
];

function getArpForBar(bar) {
  const blockIndex = Math.floor(bar / 4);
  const v = variations[blockIndex] || null;
  if (!v) return arpBase;
  const arp = arpBase.map(s => ({ ...s }));
  arp[v.step].note = v.note;
  if (v.slide !== undefined) arp[v.step].slide = v.slide;
  return arp;
}

// ── RENDER ──

async function render() {
  console.log(`Rendering Drift: ${TOTAL_BARS} bars, ${BPM} BPM, ${DURATION.toFixed(1)}s`);
  
  const actx = new OfflineAudioContext(2, Math.ceil(DURATION * SAMPLE_RATE), SAMPLE_RATE);

  // JT10
  const jt10 = new JT10Engine({ context: actx });
  jt10.setParameter('sawLevel', 0.6);
  jt10.setParameter('pulseLevel', 0.15);
  jt10.setParameter('pulseWidth', 0.4);
  jt10.setParameter('subLevel', 0.3);
  jt10.setParameter('subMode', 1);
  jt10.setParameter('cutoff', 0.03);
  jt10.setParameter('resonance', 0.0);
  jt10.setParameter('envMod', 0.4);
  jt10.setParameter('keyTrack', 0.3);
  jt10.setParameter('attack', 0.08);
  jt10.setParameter('decay', 0.55);
  jt10.setParameter('sustain', 0.45);
  jt10.setParameter('release', 0.5);
  jt10.setParameter('filterAttack', 0.1);
  jt10.setParameter('filterDecay', 0.5);
  jt10.setParameter('filterSustain', 0.2);
  jt10.setParameter('filterRelease', 0.4);
  jt10.setParameter('glideTime', 0.3);
  jt10.setParameter('lfoRate', 0.08);
  jt10.setParameter('lfoToFilter', 0.06);
  jt10.masterVolume = 0.3;

  // Reverb
  const reverbTime = 6.0;
  const irLength = SAMPLE_RATE * reverbTime;
  const irBuffer = actx.createBuffer(2, irLength, SAMPLE_RATE);
  for (let ch = 0; ch < 2; ch++) {
    const data = irBuffer.getChannelData(ch);
    for (let i = 0; i < irLength; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLength, 1.8);
    }
  }
  const convolver = actx.createConvolver();
  convolver.buffer = irBuffer;

  const dryGain = actx.createGain();
  const wetGain = actx.createGain();
  dryGain.gain.value = 0.80;
  wetGain.gain.value = 0.10;

  const reverbHP = actx.createBiquadFilter();
  reverbHP.type = 'highpass';
  reverbHP.frequency.value = 100;

  convolver.connect(reverbHP);
  reverbHP.connect(wetGain);
  dryGain.connect(actx.destination);
  wetGain.connect(actx.destination);

  // Wire JT10
  if (jt10._scriptNode) {
    jt10._scriptNode.disconnect();
    jt10._scriptNode.connect(dryGain);
    jt10._scriptNode.connect(convolver);
  } else if (jt10.masterGain) {
    jt10.masterGain.disconnect();
    jt10.masterGain.connect(dryGain);
    jt10.masterGain.connect(convolver);
  }

  // JB01 kick
  const jb01 = new JB01Engine({ context: actx });
  jb01.setVoiceParam('kick', 'decay', 0.3);
  jb01.setVoiceParam('kick', 'tune', -0.2);
  jb01.setVoiceParam('kick', 'attack', 0.6);
  jb01.setVoiceParam('kick', 'level', 0.75);

  const kickGain = actx.createGain();
  kickGain.gain.value = 0;
  jb01.connectOutput(kickGain);
  
  const kickDry = actx.createGain();
  kickDry.gain.value = 0.85;
  kickGain.connect(kickDry);
  kickGain.connect(convolver);  // 15% reverb send
  kickDry.connect(actx.destination);

  // Use deterministic random for reproducibility
  let seed = 42;
  function rng() {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }

  // Schedule all notes
  for (let step = 0; step < TOTAL_STEPS; step++) {
    const time = step * STEP_DUR;
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;
    const section = getSection(step);
    const prob = getNoteProbability(step);
    const cutoff = getCutoff(step);
    const mix = getReverbMix(step);

    // Update params at each step
    jt10.setParameter('cutoff', cutoff);
    wetGain.gain.setValueAtTime(mix.wet, time);
    dryGain.gain.setValueAtTime(mix.dry, time);

    // Kick
    const kickActive = bar >= 57 && bar < 76;
    if (kickActive && stepInBar % 4 === 0) {
      let kGain = 1.0;
      if (bar < 59) {
        kGain = Math.min((bar - 57 + stepInBar / 16) / 2, 1.0);
      } else if (bar >= 71) {
        kGain = Math.max(1.0 - (bar - 71 + stepInBar / 16) / 5, 0);
      }
      kickGain.gain.setValueAtTime(kGain, time);
      const kickVel = 0.8 + (rng() - 0.5) * 0.06;
      jb01.trigger('kick', kickVel, time);
    }

    // Arp
    const arp = getArpForBar(bar);
    const s = arp[stepInBar];
    if (s.gate && rng() < prob) {
      const vel = s.accent ? 0.85 : 0.55;
      jt10.playNote(s.note, vel, s.slide);
    }
  }

  // Render
  console.log('Rendering offline...');
  const buffer = await actx.startRendering();
  console.log(`Rendered: ${buffer.duration.toFixed(1)}s, ${buffer.numberOfChannels}ch`);

  // ── ANALYSIS ──
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  
  // Analyze per-bar
  const samplesPerBar = Math.floor(SAMPLE_RATE * STEP_DUR * 16);
  
  console.log('\n=== PER-BAR ANALYSIS ===');
  console.log('Bar | Section   | RMS L    | RMS R    | Peak     | Cutoff | Reverb W | NotePr');
  console.log('----|-----------|----------|----------|----------|--------|----------|-------');

  const sectionRMS = {};

  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const start = bar * samplesPerBar;
    const end = Math.min(start + samplesPerBar, left.length);
    let sumSqL = 0, sumSqR = 0, peak = 0;
    const count = end - start;

    for (let i = start; i < end; i++) {
      sumSqL += left[i] * left[i];
      sumSqR += right[i] * right[i];
      const p = Math.max(Math.abs(left[i]), Math.abs(right[i]));
      if (p > peak) peak = p;
    }

    const rmsL = Math.sqrt(sumSqL / count);
    const rmsR = Math.sqrt(sumSqR / count);
    const step0 = bar * 16;
    const section = getSection(step0);
    const cutoff = getCutoff(step0);
    const mix = getReverbMix(step0);
    const prob = getNoteProbability(step0);

    if (!sectionRMS[section]) sectionRMS[section] = [];
    sectionRMS[section].push((rmsL + rmsR) / 2);

    // Print every 2 bars to keep it readable
    if (bar % 2 === 0) {
      console.log(
        `${(bar+1).toString().padStart(3)} | ${section.padEnd(9)} | ${rmsL.toFixed(5).padStart(8)} | ${rmsR.toFixed(5).padStart(8)} | ${peak.toFixed(4).padStart(8)} | ${cutoff.toFixed(2).padStart(6)} | ${mix.wet.toFixed(2).padStart(8)} | ${prob.toFixed(2).padStart(5)}`
      );
    }
  }

  // Section summaries
  console.log('\n=== SECTION SUMMARY ===');
  console.log('Section   | Avg RMS  | Min RMS  | Max RMS  | Bars');
  console.log('----------|----------|----------|----------|-----');
  for (const [sec, values] of Object.entries(sectionRMS)) {
    const avg = values.reduce((a,b) => a+b) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    console.log(`${sec.padEnd(9)} | ${avg.toFixed(5).padStart(8)} | ${min.toFixed(5).padStart(8)} | ${max.toFixed(5).padStart(8)} | ${values.length}`);
  }

  // Transition analysis
  console.log('\n=== TRANSITIONS ===');
  const transitions = [
    [15, 16, 'RISE → PEAK'],
    [23, 24, 'PEAK → DISSOLVE'],
    [39, 40, 'DISSOLVE → DRIFT'],
    [55, 56, 'DRIFT → RETURN'],
    [63, 64, 'RETURN → KICK'],
    [70, 71, 'KICK → FADEOUT'],
  ];
  for (const [a, b, label] of transitions) {
    const rmsA = sectionRMS[getSection(a * 16)]?.[0] || 0;
    // Compute actual bar RMS
    const startA = a * samplesPerBar;
    const startB = b * samplesPerBar;
    let sqA = 0, sqB = 0;
    for (let i = 0; i < samplesPerBar && startA + i < left.length; i++) {
      sqA += left[startA + i] ** 2;
    }
    for (let i = 0; i < samplesPerBar && startB + i < left.length; i++) {
      sqB += left[startB + i] ** 2;
    }
    const ra = Math.sqrt(sqA / samplesPerBar);
    const rb = Math.sqrt(sqB / samplesPerBar);
    const change = ((rb - ra) / (ra || 0.0001) * 100).toFixed(1);
    console.log(`${label.padEnd(22)} | bar ${a+1}: ${ra.toFixed(5)} → bar ${b+1}: ${rb.toFixed(5)} (${change}%)`);
  }

  // Write WAV for further analysis if needed
  const wavPath = '/Users/bart/.openclaw/agents/hallman/workspace/drift-analysis.wav';
  const numSamples = left.length;
  const wavBuffer = Buffer.alloc(44 + numSamples * 4); // 16-bit stereo
  // WAV header
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + numSamples * 4, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20); // PCM
  wavBuffer.writeUInt16LE(2, 22); // stereo
  wavBuffer.writeUInt32LE(SAMPLE_RATE, 24);
  wavBuffer.writeUInt32LE(SAMPLE_RATE * 4, 28);
  wavBuffer.writeUInt16LE(4, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(numSamples * 4, 40);
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i] || left[i]));
    wavBuffer.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    wavBuffer.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
  }
  writeFileSync(wavPath, wavBuffer);
  console.log(`\nWAV written: ${wavPath} (${(wavBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
}

render().catch(e => { console.error(e); process.exit(1); });
