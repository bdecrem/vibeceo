/**
 * JB-01 Reference Drum Machine UI
 *
 * Simple 8-voice drum machine with sequencer grid and voice parameters.
 */

import { JB01Engine, VOICES } from '../../machines/jb01/engine.js';

// Voice display names and colors
const VOICE_INFO = {
  kick:   { name: 'KICK',   short: 'KK', color: '#ff4757' },
  snare:  { name: 'SNARE',  short: 'SN', color: '#ffa502' },
  clap:   { name: 'CLAP',   short: 'CP', color: '#2ed573' },
  ch:     { name: 'CH',     short: 'CH', color: '#1e90ff' },
  oh:     { name: 'OH',     short: 'OH', color: '#5352ed' },
  perc:   { name: 'PERC',   short: 'PC', color: '#ff6b81' },
  tom:    { name: 'TOM',    short: 'TM', color: '#7bed9f' },
  cymbal: { name: 'CYM',    short: 'CY', color: '#70a1ff' },
};

// Voice parameter definitions
const VOICE_PARAMS = {
  kick:   ['tune', 'decay', 'attack', 'sweep', 'level'],
  snare:  ['tune', 'decay', 'tone', 'snappy', 'level'],
  clap:   ['decay', 'tone', 'level'],
  ch:     ['tune', 'decay', 'tone', 'level'],
  oh:     ['tune', 'decay', 'tone', 'level'],
  perc:   ['tune', 'decay', 'level'],
  tom:    ['tune', 'decay', 'level'],
  cymbal: ['tune', 'decay', 'level'],
};

// App state
let engine = null;
let pattern = {};
let selectedVoice = 'kick';
let isPlaying = false;
let currentStep = -1;
let bpm = 128;
let swing = 0;

// Initialize pattern
function initPattern() {
  for (const voice of VOICES) {
    pattern[voice] = Array(16).fill(null).map(() => ({
      velocity: 0,
      accent: false,
    }));
  }
}

// Initialize engine
async function initEngine() {
  engine = new JB01Engine({ bpm });
  await engine.start();
  window.engine = engine; // Expose for testing
  console.log('JB01 Engine initialized');
}

// Build sequencer grid
function buildSequencer() {
  const container = document.getElementById('sequencer');
  container.innerHTML = '';

  // Step numbers row
  const numberRow = document.createElement('div');
  numberRow.className = 'step-number-row';
  numberRow.innerHTML = '<div></div>'; // Empty cell for voice label column
  for (let i = 1; i <= 16; i++) {
    const num = document.createElement('div');
    num.className = 'step-number';
    num.textContent = i;
    numberRow.appendChild(num);
  }
  container.appendChild(numberRow);

  // Voice rows
  for (const voice of VOICES) {
    const row = document.createElement('div');
    row.className = 'voice-row';

    // Voice label
    const label = document.createElement('div');
    label.className = `voice-label ${voice}`;
    label.textContent = VOICE_INFO[voice].short;
    label.dataset.voice = voice;
    label.addEventListener('click', () => selectVoice(voice));
    row.appendChild(label);

    // Steps
    for (let step = 0; step < 16; step++) {
      const stepEl = document.createElement('div');
      stepEl.className = 'step';
      stepEl.dataset.voice = voice;
      stepEl.dataset.step = step;
      stepEl.addEventListener('click', (e) => toggleStep(voice, step, e.shiftKey));
      stepEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleAccent(voice, step);
      });
      row.appendChild(stepEl);
    }

    container.appendChild(row);
  }

  updateSequencerDisplay();
}

// Update sequencer display
function updateSequencerDisplay() {
  for (const voice of VOICES) {
    for (let step = 0; step < 16; step++) {
      const stepEl = document.querySelector(`[data-voice="${voice}"][data-step="${step}"]`);
      if (!stepEl) continue;

      const stepData = pattern[voice][step];
      stepEl.classList.toggle('active', stepData.velocity > 0);
      stepEl.classList.toggle('accent', stepData.accent);
      stepEl.classList.toggle('playing', step === currentStep && stepData.velocity > 0);
    }
  }

  // Update voice label selection
  document.querySelectorAll('.voice-label').forEach(el => {
    el.classList.toggle('selected', el.dataset.voice === selectedVoice);
  });
}

// Toggle step
function toggleStep(voice, step, isAccent = false) {
  const stepData = pattern[voice][step];
  if (stepData.velocity > 0) {
    stepData.velocity = 0;
    stepData.accent = false;
  } else {
    stepData.velocity = 1;
    stepData.accent = isAccent;
  }
  updateSequencerDisplay();

  // Trigger sound preview
  if (engine && stepData.velocity > 0) {
    engine.trigger(voice, stepData.velocity);
  }
}

// Toggle accent
function toggleAccent(voice, step) {
  const stepData = pattern[voice][step];
  if (stepData.velocity > 0) {
    stepData.accent = !stepData.accent;
    updateSequencerDisplay();
  }
}

// Select voice
function selectVoice(voice) {
  selectedVoice = voice;
  updateSequencerDisplay();
  buildVoiceParams(voice);

  // Update title
  document.getElementById('voice-title').textContent = VOICE_INFO[voice].name;

  // Trigger preview
  if (engine) {
    engine.trigger(voice, 1);
  }
}

// Build voice parameters
function buildVoiceParams(voice) {
  const container = document.getElementById('voice-params');
  container.innerHTML = '';

  const params = VOICE_PARAMS[voice];
  for (const param of params) {
    const control = document.createElement('div');
    control.className = 'param-control';

    const label = document.createElement('label');
    label.textContent = param;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = param === 'tune' ? -12 : 0;
    slider.max = param === 'tune' ? 12 : 100;
    slider.step = param === 'tune' ? 1 : 1;
    slider.value = getVoiceParam(voice, param);

    const value = document.createElement('span');
    value.className = 'param-value';
    value.textContent = formatParamValue(param, slider.value);

    slider.addEventListener('input', () => {
      setVoiceParam(voice, param, parseFloat(slider.value));
      value.textContent = formatParamValue(param, slider.value);
    });

    control.appendChild(label);
    control.appendChild(slider);
    control.appendChild(value);
    container.appendChild(control);
  }
}

// Get voice parameter (from engine)
function getVoiceParam(voice, param) {
  if (!engine) return param === 'tune' ? 0 : 50;

  const voiceObj = engine.voices.get(voice);
  if (!voiceObj) return param === 'tune' ? 0 : 50;

  if (param === 'tune') {
    return voiceObj.tune / 100; // cents to semitones
  } else if (param === 'level') {
    return voiceObj.level * 100;
  } else {
    return (voiceObj[param] || 0.5) * 100;
  }
}

// Set voice parameter
function setVoiceParam(voice, param, value) {
  if (!engine) return;

  if (param === 'tune') {
    engine.setVoiceParam(voice, 'tune', value * 100); // semitones to cents
  } else if (param === 'level') {
    engine.setVoiceParam(voice, 'level', value / 100);
  } else {
    engine.setVoiceParam(voice, param, value / 100);
  }
}

// Format parameter value
function formatParamValue(param, value) {
  if (param === 'tune') {
    const v = parseInt(value);
    return v > 0 ? `+${v}st` : `${v}st`;
  }
  return `${Math.round(value)}`;
}

// Play/stop sequencer
async function togglePlay() {
  if (isPlaying) {
    stopPlayback();
  } else {
    await startPlayback();
  }
}

// Start playback
async function startPlayback() {
  if (!engine) await initEngine();

  isPlaying = true;
  currentStep = -1;
  document.getElementById('play-toggle').textContent = 'Stop';
  document.getElementById('play-toggle').classList.add('playing');

  playStep();
}

// Play current step and schedule next
function playStep() {
  if (!isPlaying) return;

  currentStep = (currentStep + 1) % 16;

  // Trigger voices for this step
  for (const voice of VOICES) {
    const stepData = pattern[voice][currentStep];
    if (stepData.velocity > 0) {
      const velocity = stepData.accent ? 1.2 : 1;
      engine.trigger(voice, velocity);
    }
  }

  updateSequencerDisplay();

  // Schedule next step
  const stepDuration = 60 / bpm / 4;
  const swingOffset = currentStep % 2 === 1 ? (swing / 100) * stepDuration * 0.5 : 0;
  setTimeout(playStep, (stepDuration + swingOffset) * 1000);
}

// Stop playback
function stopPlayback() {
  isPlaying = false;
  currentStep = -1;
  document.getElementById('play-toggle').textContent = 'Play';
  document.getElementById('play-toggle').classList.remove('playing');
  updateSequencerDisplay();
}

// Export WAV
async function exportWav() {
  if (!engine) await initEngine();

  setStatus('Rendering...');

  try {
    const buffer = await engine.renderPattern(pattern, { bars: 2, bpm });

    // Convert to WAV
    const wav = audioBufferToWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    // Download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jb01-pattern.wav';
    a.click();
    URL.revokeObjectURL(url);

    setStatus('Exported!');
  } catch (e) {
    setStatus('Export failed: ' + e.message);
  }
}

// Simple WAV encoder
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const dataLength = length * numChannels * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave and write samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return wavBuffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Set status message
function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

// Event listeners
function setupEventListeners() {
  // BPM
  document.getElementById('bpm').addEventListener('input', (e) => {
    bpm = parseInt(e.target.value) || 128;
    if (engine) engine.setBpm(bpm);
  });

  // Swing
  document.getElementById('swing').addEventListener('input', (e) => {
    swing = parseInt(e.target.value);
    document.getElementById('swing-value').textContent = `${swing}%`;
    if (engine) engine.setSwing(swing / 100);
  });

  // Volume
  document.getElementById('volume').addEventListener('input', (e) => {
    const vol = parseInt(e.target.value);
    document.getElementById('volume-value').textContent = `${vol}%`;
    if (engine) {
      engine.masterGain.gain.value = vol / 100;
    }
  });

  // Play/Stop
  document.getElementById('play-toggle').addEventListener('click', togglePlay);

  // Export
  document.getElementById('export-wav').addEventListener('click', exportWav);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    // Space: play/stop
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    }

    // 1-8: trigger voices
    const keyMap = { '1': 'kick', '2': 'snare', '3': 'clap', '4': 'ch', '5': 'oh', '6': 'perc', '7': 'tom', '8': 'cymbal' };
    if (keyMap[e.key] && engine) {
      engine.trigger(keyMap[e.key], 1);
      selectVoice(keyMap[e.key]);
    }
  });
}

// Initialize
async function init() {
  initPattern();
  buildSequencer();
  buildVoiceParams('kick');
  setupEventListeners();
  await initEngine();
  setStatus('Ready');
}

init();
