/**
 * JT-90 UI Application
 *
 * Full-featured drum machine UI matching the R9-D9 experience,
 * but using the JT90 modular DSP engine.
 */

import { JT90Engine } from '../../machines/jt90/engine.js';

const STEPS = 16;

// Voice synthesis information for info modal
const VOICE_INFO = {
  kick: {
    synthesis: 'Triangle oscillator shaped to sine via soft saturation. Pitch envelope sweeps from high to base frequency. Click transient with filtered noise burst.',
  },
  snare: {
    synthesis: 'Dual oscillators (body + overtone) with filtered noise. Snappy parameter controls noise-to-tone ratio. Pitch envelope on oscillators.',
  },
  clap: {
    synthesis: 'Four-burst envelope on bandpass-filtered noise. Each burst has slight timing variation for organic feel. Reverb-like tail.',
  },
  rimshot: {
    synthesis: 'Short metallic pulse using bridged-T resonant filters. High-passed noise transient for attack.',
  },
  ltom: {
    synthesis: 'Low sine oscillator with pitch envelope. Soft saturation for warmth. Longer decay than kick.',
  },
  mtom: {
    synthesis: 'Mid-range sine oscillator with pitch envelope. Same architecture as low tom at different pitch.',
  },
  htom: {
    synthesis: 'High sine oscillator with pitch envelope. Shortest decay of the tom family.',
  },
  ch: {
    synthesis: 'Six square oscillators at inharmonic frequencies (205-1204 Hz). Bandpass filtered for metallic shimmer. Fast decay.',
  },
  oh: {
    synthesis: 'Same six oscillators as closed hat. Extended envelope for open ring. Choked when closed hat triggers.',
  },
  crash: {
    synthesis: 'Six square oscillators tuned lower (245-1225 Hz). Long decay envelope. Bandpass filtered for crash character.',
  },
  ride: {
    synthesis: 'Six square oscillators with tighter ratios (180-1080 Hz). Bell-like quality. Medium decay.',
  },
};

// Create and append info modal to body
let infoModal = null;
function createInfoModal() {
  if (infoModal) return infoModal;
  infoModal = document.createElement('div');
  infoModal.className = 'voice-info-modal';
  infoModal.innerHTML = `
    <div class="voice-info-content">
      <div class="voice-info-header">
        <span class="voice-info-title"></span>
        <button class="voice-info-close" aria-label="Close">&times;</button>
      </div>
      <div class="voice-info-body"></div>
    </div>
  `;
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) hideInfoModal();
  });
  infoModal.querySelector('.voice-info-close').addEventListener('click', hideInfoModal);
  document.body.appendChild(infoModal);
  return infoModal;
}

function hideInfoModal() {
  if (infoModal) infoModal.classList.remove('active');
}

function showVoiceInfo(voiceId, voiceLabel) {
  const modal = createInfoModal();
  const info = VOICE_INFO[voiceId];
  if (!info) return;

  modal.querySelector('.voice-info-title').textContent = voiceLabel;
  modal.querySelector('.voice-info-body').innerHTML = `
    <div class="voice-info-section">
      <div class="voice-info-label">Synthesis</div>
      <div class="voice-info-text">${info.synthesis}</div>
    </div>
    <div class="voice-info-note">Pure JS DSP - identical output in browser and CLI.</div>
  `;
  modal.classList.add('active');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideInfoModal();
});

// Pattern state
const pattern = {};
const engine = new JT90Engine();
window.engine = engine;

let currentStep = -1;

const VOICES = [
  { id: 'kick', label: 'Bass Drum', shortLabel: 'BD' },
  { id: 'snare', label: 'Snare', shortLabel: 'SD' },
  { id: 'clap', label: 'Clap', shortLabel: 'CP' },
  { id: 'rimshot', label: 'Rim Shot', shortLabel: 'RS' },
  { id: 'ltom', label: 'Low Tom', shortLabel: 'LT' },
  { id: 'mtom', label: 'Mid Tom', shortLabel: 'MT' },
  { id: 'htom', label: 'High Tom', shortLabel: 'HT' },
  { id: 'ch', label: 'Closed Hat', shortLabel: 'CH' },
  { id: 'oh', label: 'Open Hat', shortLabel: 'OH' },
  { id: 'crash', label: 'Crash', shortLabel: 'CC' },
  { id: 'ride', label: 'Ride', shortLabel: 'RC' },
];

// Pattern helpers
function ensureTrack(voiceId) {
  if (!pattern[voiceId]) {
    pattern[voiceId] = Array.from({ length: STEPS }, () => ({ velocity: 0, accent: false }));
  }
  return pattern[voiceId];
}

function initPattern() {
  VOICES.forEach((voice) => {
    const track = ensureTrack(voice.id);
    track.forEach((step) => {
      step.velocity = 0;
      step.accent = false;
    });
  });
  commitPattern();
}

function commitPattern() {
  engine.setPattern(pattern);
}

function nextVelocity(value) {
  if (value <= 0) return 0.6;
  if (value < 1) return 1;
  return 0;
}

function toggleStep(voiceId, stepIndex, button) {
  const track = ensureTrack(voiceId);
  const current = track[stepIndex] ?? { velocity: 0 };
  const velocity = nextVelocity(current.velocity);
  track[stepIndex] = { ...current, velocity };
  updateStepButton(button, velocity);
  commitPattern();

  // Preview sound when adding step
  if (velocity > 0) {
    engine.trigger(voiceId, velocity);
  }
}

function updateStepButton(button, velocity) {
  button.classList.toggle('step--on', velocity > 0);
  button.classList.toggle('step--accent', velocity >= 1);
  button.setAttribute('data-level', velocity.toFixed(1));
}

// Render sequencer grid
function renderGrid() {
  const container = document.getElementById('sequencer');
  if (!container) return;
  container.innerHTML = '';

  VOICES.forEach((voice) => {
    const row = document.createElement('div');
    row.className = 'voice-row';
    row.dataset.voiceId = voice.id;

    // Full label (desktop)
    const label = document.createElement('button');
    label.className = 'voice-label';
    label.textContent = voice.label;
    label.dataset.voiceId = voice.id;
    label.addEventListener('click', (e) => {
      e.preventDefault();
      engine.trigger(voice.id, 0.8);
    });
    row.appendChild(label);

    // Short label (mobile)
    const shortLabel = document.createElement('button');
    shortLabel.className = 'voice-label-short';
    shortLabel.textContent = voice.shortLabel;
    shortLabel.dataset.voiceId = voice.id;
    shortLabel.addEventListener('click', (e) => {
      e.preventDefault();
      engine.trigger(voice.id, 0.8);
    });
    row.appendChild(shortLabel);

    const track = ensureTrack(voice.id);
    for (let i = 0; i < STEPS; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'step';
      button.dataset.index = i.toString();
      button.dataset.voiceId = voice.id;
      updateStepButton(button, track[i].velocity);
      button.addEventListener('click', () => toggleStep(voice.id, i, button));
      row.appendChild(button);
    }
    container.appendChild(row);
  });
}

// Voice parameter formatting
function formatParamValue(value, descriptor) {
  const unit = descriptor.unit ?? '';
  if (unit === 'cents') {
    const rounded = Math.round(value);
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  }
  if (unit === 's') return value.toFixed(2);
  if (unit === 'ms') return value.toFixed(0);
  if (descriptor.max === 1 && descriptor.min === 0) {
    return Math.round(value * 100).toString();
  }
  return value.toFixed(1);
}

function valueToRotation(value, min, max) {
  const normalized = (value - min) / (max - min);
  return -135 + normalized * 270;
}

// Knob drag state
let activeKnob = null;

function startKnobDrag(clientY, knobEl, voiceId, param, valueDisplay) {
  const min = param.min ?? 0;
  const max = param.max ?? 1;
  const currentRotation = parseFloat(knobEl.style.getPropertyValue('--rotation') || '0');
  const currentValue = min + ((currentRotation + 135) / 270) * (max - min);

  activeKnob = {
    element: knobEl,
    startY: clientY,
    startValue: currentValue,
    min, max,
    voiceId,
    paramId: param.id,
    valueDisplay,
    descriptor: param,
  };
  document.body.style.cursor = 'ns-resize';
}

function updateKnobFromDrag(clientY) {
  if (!activeKnob) return;

  const deltaY = activeKnob.startY - clientY;
  const range = activeKnob.max - activeKnob.min;
  const sensitivity = range / 150;

  let newValue = activeKnob.startValue + deltaY * sensitivity;
  newValue = Math.max(activeKnob.min, Math.min(activeKnob.max, newValue));

  const rotation = valueToRotation(newValue, activeKnob.min, activeKnob.max);
  activeKnob.element.style.setProperty('--rotation', `${rotation}`);
  activeKnob.element.style.transform = `rotate(${rotation}deg)`;

  engine.setVoiceParameter(activeKnob.voiceId, activeKnob.paramId, newValue);
  activeKnob.valueDisplay.textContent = formatParamValue(newValue, activeKnob.descriptor);
}

function handleKnobEnd() {
  if (activeKnob) {
    activeKnob = null;
    document.body.style.cursor = '';
  }
}

document.addEventListener('mousemove', (e) => updateKnobFromDrag(e.clientY));
document.addEventListener('mouseup', handleKnobEnd);
document.addEventListener('touchmove', (e) => {
  if (activeKnob && e.touches.length > 0) {
    e.preventDefault();
    updateKnobFromDrag(e.touches[0].clientY);
  }
}, { passive: false });
document.addEventListener('touchend', handleKnobEnd);

// Render voice parameter panels
function renderVoiceParams() {
  const container = document.getElementById('voice-params');
  if (!container) return;
  container.innerHTML = '';

  VOICES.forEach((voice) => {
    const params = engine.getVoiceParams(voice.id);
    if (!params || params.length === 0) return;

    const panel = document.createElement('div');
    panel.className = 'voice-panel';
    panel.dataset.voiceId = voice.id;

    // Header with LED and name
    const header = document.createElement('div');
    header.className = 'voice-panel-header';

    const led = document.createElement('div');
    led.className = 'voice-panel-led';
    led.dataset.voiceId = voice.id;

    const name = document.createElement('span');
    name.className = 'voice-panel-name';
    name.textContent = voice.shortLabel;

    header.appendChild(led);
    header.appendChild(name);

    // Info button
    const infoBtn = document.createElement('button');
    infoBtn.className = 'voice-info-btn';
    infoBtn.innerHTML = 'i';
    infoBtn.title = 'Synthesis info';
    infoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showVoiceInfo(voice.id, voice.label);
    });
    header.appendChild(infoBtn);

    panel.appendChild(header);

    // Knobs container
    const knobsContainer = document.createElement('div');
    knobsContainer.className = 'knobs-container';

    params.forEach((param) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'knob-wrapper';

      const knob = document.createElement('div');
      knob.className = 'knob';
      knob.dataset.voiceId = voice.id;
      knob.dataset.paramId = param.id;

      const initialRotation = valueToRotation(param.defaultValue, param.min ?? 0, param.max ?? 1);
      knob.style.setProperty('--rotation', `${initialRotation}`);
      knob.style.transform = `rotate(${initialRotation}deg)`;

      const label = document.createElement('span');
      label.className = 'knob-label';
      label.textContent = param.label;

      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'knob-value';
      valueDisplay.textContent = formatParamValue(param.defaultValue, param);

      knob.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startKnobDrag(e.clientY, knob, voice.id, param, valueDisplay);
      });
      knob.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          startKnobDrag(e.touches[0].clientY, knob, voice.id, param, valueDisplay);
        }
      }, { passive: false });

      // Double-click to reset
      knob.addEventListener('dblclick', () => {
        const rotation = valueToRotation(param.defaultValue, param.min ?? 0, param.max ?? 1);
        knob.style.setProperty('--rotation', `${rotation}`);
        knob.style.transform = `rotate(${rotation}deg)`;
        engine.setVoiceParameter(voice.id, param.id, param.defaultValue);
        valueDisplay.textContent = formatParamValue(param.defaultValue, param);
      });

      wrapper.appendChild(knob);
      wrapper.appendChild(label);
      wrapper.appendChild(valueDisplay);
      knobsContainer.appendChild(wrapper);
    });

    panel.appendChild(knobsContainer);
    container.appendChild(panel);
  });
}

// Built-in presets
const JT90_KITS = [
  { id: 'default', name: 'Default', description: 'Factory settings', voiceParams: {} },
  { id: 'punchy', name: 'Punchy', description: 'Tight, aggressive', voiceParams: {
    kick: { attack: 0.7, decay: 0.4 },
    snare: { snappy: 0.7 },
  }},
  { id: 'deep', name: 'Deep', description: 'Long decays, boomy', voiceParams: {
    kick: { decay: 0.8, sweep: 0.3 },
    snare: { decay: 0.6 },
  }},
];

const JT90_SEQUENCES = [
  { id: 'four-on-floor', name: 'Four on Floor', bpm: 120, pattern: {
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0].map(v => ({ velocity: v, accent: false })),
    ch: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(v => ({ velocity: v * 0.6, accent: false })),
  }},
  { id: 'basic-rock', name: 'Basic Rock', bpm: 100, pattern: {
    kick: [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0].map(v => ({ velocity: v, accent: false })),
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(v => ({ velocity: v, accent: false })),
    ch: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(v => ({ velocity: v * 0.6, accent: false })),
  }},
  { id: 'house', name: 'House', bpm: 128, pattern: {
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0].map(v => ({ velocity: v, accent: false })),
    ch: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0].map(v => ({ velocity: v * 0.6, accent: false })),
    oh: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(v => ({ velocity: v * 0.5, accent: false })),
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(v => ({ velocity: v, accent: false })),
  }},
];

// Load kit (voice params only)
function loadKit(kit) {
  // Reset to defaults first
  VOICES.forEach((voice) => {
    const params = engine.getVoiceParams(voice.id);
    params.forEach((param) => {
      engine.setVoiceParameter(voice.id, param.id, param.defaultValue);
      updateKnobUI(voice.id, param.id, param.defaultValue, param);
    });
  });

  // Apply kit overrides
  if (kit.voiceParams) {
    Object.entries(kit.voiceParams).forEach(([voiceId, params]) => {
      const voiceParams = engine.getVoiceParams(voiceId);
      Object.entries(params).forEach(([paramId, value]) => {
        engine.setVoiceParameter(voiceId, paramId, value);
        const paramDesc = voiceParams.find(p => p.id === paramId);
        if (paramDesc) {
          updateKnobUI(voiceId, paramId, value, paramDesc);
        }
      });
    });
  }
}

function updateKnobUI(voiceId, paramId, value, param) {
  const knob = document.querySelector(`.knob[data-voice-id="${voiceId}"][data-param-id="${paramId}"]`);
  if (knob) {
    const rotation = valueToRotation(value, param.min ?? 0, param.max ?? 1);
    knob.style.setProperty('--rotation', `${rotation}`);
    knob.style.transform = `rotate(${rotation}deg)`;
    const wrapper = knob.closest('.knob-wrapper');
    const valueDisplay = wrapper?.querySelector('.knob-value');
    if (valueDisplay) {
      valueDisplay.textContent = formatParamValue(value, param);
    }
  }
}

// Load sequence (pattern + BPM)
function loadSequence(seq) {
  const bpmInput = document.getElementById('bpm');

  VOICES.forEach((voice) => {
    const seqTrack = seq.pattern[voice.id];
    const track = ensureTrack(voice.id);
    if (seqTrack && Array.isArray(seqTrack)) {
      for (let i = 0; i < STEPS; i++) {
        track[i] = seqTrack[i] ? { ...seqTrack[i] } : { velocity: 0, accent: false };
      }
    } else {
      for (let i = 0; i < STEPS; i++) {
        track[i] = { velocity: 0, accent: false };
      }
    }
  });
  commitPattern();
  refreshGrid();

  if (bpmInput && seq.bpm) {
    bpmInput.value = String(seq.bpm);
    engine.setBpm(seq.bpm);
  }
}

function refreshGrid() {
  const container = document.getElementById('sequencer');
  if (!container) return;

  VOICES.forEach((voice) => {
    const track = pattern[voice.id];
    if (!track) return;
    const row = container.querySelector(`[data-voice-id="${voice.id}"]`);
    if (!row) return;
    const buttons = row.querySelectorAll('.step');
    buttons.forEach((btn, i) => {
      const step = track[i];
      if (step && btn instanceof HTMLButtonElement) {
        updateStepButton(btn, step.velocity);
      }
    });
  });
}

// API for saved patterns/kits
const PATTERNS_API = '/api/synth-patterns';
const KITS_API = '/api/synth-kits';
let cachedPatterns = null;
let cachedKits = null;

async function fetchPatterns() {
  try {
    const res = await fetch(`${PATTERNS_API}?machine=jt90`);
    if (!res.ok) throw new Error('Failed to fetch patterns');
    const data = await res.json();
    cachedPatterns = data.patterns || [];
    return cachedPatterns;
  } catch (e) {
    console.error('Failed to fetch patterns:', e);
    return cachedPatterns || [];
  }
}

function getSavedPatterns() {
  return cachedPatterns || [];
}

async function savePattern(name, bpm, existingPattern = null) {
  let patternCopy;
  if (existingPattern) {
    patternCopy = existingPattern;
  } else {
    patternCopy = {};
    for (const [voiceId, track] of Object.entries(pattern)) {
      patternCopy[voiceId] = track.map((step) => ({ ...step }));
    }
  }

  try {
    const res = await fetch(PATTERNS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, machine: 'jt90', bpm, pattern: patternCopy }),
    });
    if (res.status === 409) throw new Error('A pattern with this name already exists');
    if (!res.ok) throw new Error('Failed to save pattern');
    await fetchPatterns();
    return true;
  } catch (e) {
    console.error('Failed to save pattern:', e);
    throw e;
  }
}

function loadSavedPattern(name) {
  const saved = getSavedPatterns();
  return saved.find((p) => p.name === name);
}

async function deleteSavedPattern(name) {
  try {
    const res = await fetch(`${PATTERNS_API}?name=${encodeURIComponent(name)}&machine=jt90`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete pattern');
    await fetchPatterns();
    return true;
  } catch (e) {
    console.error('Failed to delete pattern:', e);
    throw e;
  }
}

async function fetchKits() {
  try {
    const res = await fetch(`${KITS_API}?machine=jt90`);
    if (!res.ok) throw new Error('Failed to fetch kits');
    const data = await res.json();
    cachedKits = data.kits || [];
    return cachedKits;
  } catch (e) {
    console.error('Failed to fetch kits:', e);
    return cachedKits || [];
  }
}

function getSavedKits() {
  return cachedKits || [];
}

async function saveKit(name, existingKit = null) {
  let kitData;
  if (existingKit) {
    kitData = existingKit;
  } else {
    const voiceParams = engine.getAllVoiceParams();
    kitData = { voiceParams };
  }

  try {
    const res = await fetch(KITS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, machine: 'jt90', voiceParams: kitData.voiceParams }),
    });
    if (res.status === 409) throw new Error('A kit with this name already exists');
    if (!res.ok) throw new Error('Failed to save kit');
    await fetchKits();
    return true;
  } catch (e) {
    console.error('Failed to save kit:', e);
    throw e;
  }
}

function loadSavedKit(name) {
  const saved = getSavedKits();
  return saved.find((k) => k.name === name);
}

async function deleteSavedKit(name) {
  try {
    const res = await fetch(`${KITS_API}?name=${encodeURIComponent(name)}&machine=jt90`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete kit');
    await fetchKits();
    return true;
  } catch (e) {
    console.error('Failed to delete kit:', e);
    throw e;
  }
}

// Populate dropdowns
async function populateKits() {
  const kitSelect = document.getElementById('kit-select');
  if (!kitSelect) return;

  while (kitSelect.options.length > 1) kitSelect.remove(1);

  // Built-in presets
  if (JT90_KITS.length > 0) {
    const presetsGroup = document.createElement('optgroup');
    presetsGroup.label = 'Presets';
    JT90_KITS.forEach((kit) => {
      const option = document.createElement('option');
      option.value = `preset:${kit.id}`;
      option.textContent = kit.name;
      presetsGroup.appendChild(option);
    });
    kitSelect.appendChild(presetsGroup);
  }

  // Saved kits
  const saved = await fetchKits();
  if (saved.length > 0) {
    const savedGroup = document.createElement('optgroup');
    savedGroup.label = 'My Kits';
    saved.forEach((k) => {
      const option = document.createElement('option');
      option.value = `saved:${k.name}`;
      option.textContent = k.name;
      savedGroup.appendChild(option);
    });
    kitSelect.appendChild(savedGroup);
  }

  // Actions
  const actionsGroup = document.createElement('optgroup');
  actionsGroup.label = '---';
  const saveOption = document.createElement('option');
  saveOption.value = 'action:save';
  saveOption.textContent = 'Save current as...';
  actionsGroup.appendChild(saveOption);
  if (saved.length > 0) {
    const manageOption = document.createElement('option');
    manageOption.value = 'action:manage';
    manageOption.textContent = 'Manage...';
    actionsGroup.appendChild(manageOption);
  }
  kitSelect.appendChild(actionsGroup);

  kitSelect.value = 'preset:default';
}

async function populatePatterns() {
  const patternSelect = document.getElementById('pattern-select');
  if (!patternSelect) return;

  while (patternSelect.options.length > 1) patternSelect.remove(1);

  // Built-in sequences
  if (JT90_SEQUENCES.length > 0) {
    const presetsGroup = document.createElement('optgroup');
    presetsGroup.label = 'Presets';
    JT90_SEQUENCES.forEach((seq) => {
      const option = document.createElement('option');
      option.value = `preset:${seq.id}`;
      option.textContent = `${seq.name} (${seq.bpm})`;
      presetsGroup.appendChild(option);
    });
    patternSelect.appendChild(presetsGroup);
  }

  // Saved patterns
  const saved = await fetchPatterns();
  if (saved.length > 0) {
    const savedGroup = document.createElement('optgroup');
    savedGroup.label = 'My Patterns';
    saved.forEach((p) => {
      const option = document.createElement('option');
      option.value = `saved:${p.name}`;
      option.textContent = `${p.name} (${p.bpm})`;
      savedGroup.appendChild(option);
    });
    patternSelect.appendChild(savedGroup);
  }

  // Actions
  const actionsGroup = document.createElement('optgroup');
  actionsGroup.label = '---';
  const saveOption = document.createElement('option');
  saveOption.value = 'action:save';
  saveOption.textContent = 'Save current as...';
  actionsGroup.appendChild(saveOption);
  if (saved.length > 0) {
    const manageOption = document.createElement('option');
    manageOption.value = 'action:manage';
    manageOption.textContent = 'Manage...';
    actionsGroup.appendChild(manageOption);
  }
  patternSelect.appendChild(actionsGroup);
}

// Setup controls
function setupControls() {
  const playToggleBtn = document.getElementById('play-toggle');
  const bpmInput = document.getElementById('bpm');
  const kitSelect = document.getElementById('kit-select');
  const patternSelect = document.getElementById('pattern-select');
  const swingInput = document.getElementById('swing');
  const swingValue = document.getElementById('swing-value');
  const volumeInput = document.getElementById('volume');
  const volumeValue = document.getElementById('volume-value');
  const accentInput = document.getElementById('accent');
  const accentValue = document.getElementById('accent-value');
  const patternLengthSelect = document.getElementById('pattern-length');
  const scaleModeSelect = document.getElementById('scale-mode');

  let previousKitValue = 'preset:default';
  let previousPatternValue = '';

  populateKits();
  populatePatterns();

  // Kit selection
  kitSelect?.addEventListener('change', async () => {
    const value = kitSelect.value;
    if (!value) { previousKitValue = ''; return; }

    const [type, id] = value.split(':');
    if (type === 'preset') {
      previousKitValue = value;
      const kit = JT90_KITS.find(k => k.id === id);
      if (kit) {
        loadKit(kit);
        setStatus(`Kit: ${kit.name}`);
      }
    } else if (type === 'saved') {
      previousKitValue = value;
      const saved = loadSavedKit(id);
      if (saved) {
        loadKit({ voiceParams: saved.voice_params || saved.voiceParams });
        setStatus(`Kit: ${id}`);
      }
    } else if (type === 'action' && id === 'save') {
      kitSelect.value = previousKitValue;
      const name = prompt('Enter kit name:');
      if (name && name.trim()) {
        try {
          setStatus('Saving kit...');
          await saveKit(name.trim());
          await populateKits();
          kitSelect.value = `saved:${name.trim()}`;
          previousKitValue = kitSelect.value;
          setStatus(`Saved kit: ${name.trim()}`);
        } catch (e) {
          setStatus(`Failed to save: ${e.message}`);
        }
      }
    } else if (type === 'action' && id === 'manage') {
      kitSelect.value = previousKitValue;
      showManageKitsModal();
    }
  });

  // Pattern selection
  patternSelect?.addEventListener('change', async () => {
    const value = patternSelect.value;
    if (!value) { previousPatternValue = ''; setStatus('Custom pattern mode'); return; }

    const [type, id] = value.split(':');
    if (type === 'preset') {
      previousPatternValue = value;
      const seq = JT90_SEQUENCES.find(s => s.id === id);
      if (seq) {
        loadSequence(seq);
        setStatus(`Pattern: ${seq.name} at ${seq.bpm} BPM`);
      }
    } else if (type === 'saved') {
      previousPatternValue = value;
      const saved = loadSavedPattern(id);
      if (saved) {
        VOICES.forEach((voice) => {
          const savedTrack = saved.pattern[voice.id];
          const track = ensureTrack(voice.id);
          if (savedTrack && Array.isArray(savedTrack)) {
            for (let i = 0; i < STEPS; i++) {
              track[i] = savedTrack[i] ? { ...savedTrack[i] } : { velocity: 0, accent: false };
            }
          } else {
            for (let i = 0; i < STEPS; i++) {
              track[i] = { velocity: 0, accent: false };
            }
          }
        });
        commitPattern();
        refreshGrid();
        if (bpmInput) {
          bpmInput.value = String(saved.bpm);
          engine.setBpm(saved.bpm);
        }
        setStatus(`Loaded: ${id}`);
      }
    } else if (type === 'action' && id === 'save') {
      patternSelect.value = previousPatternValue;
      const name = prompt('Enter pattern name:');
      if (name && name.trim()) {
        const bpm = bpmInput ? Number(bpmInput.value) || 128 : 128;
        try {
          setStatus('Saving pattern...');
          await savePattern(name.trim(), bpm);
          await populatePatterns();
          patternSelect.value = `saved:${name.trim()}`;
          previousPatternValue = patternSelect.value;
          setStatus(`Saved: ${name.trim()}`);
        } catch (e) {
          setStatus(`Failed to save: ${e.message}`);
        }
      }
    } else if (type === 'action' && id === 'manage') {
      patternSelect.value = previousPatternValue;
      showManageModal();
    }
  });

  // Swing
  swingInput?.addEventListener('input', () => {
    const swing = Number(swingInput.value) / 100;
    engine.setSwing(swing);
    if (swingValue) swingValue.textContent = `${swingInput.value}%`;
  });

  // Volume
  volumeInput?.addEventListener('input', () => {
    const volume = Number(volumeInput.value) / 100;
    engine.setVolume(volume);
    if (volumeValue) volumeValue.textContent = `${volumeInput.value}%`;
  });

  // Accent
  accentInput?.addEventListener('input', () => {
    const accent = Number(accentInput.value) / 100;
    engine.setAccentLevel(accent);
    if (accentValue) accentValue.textContent = `${accentInput.value}%`;
  });

  // Pattern length
  patternLengthSelect?.addEventListener('change', () => {
    const length = Number(patternLengthSelect.value);
    engine.setPatternLength(length);
    setStatus(`Pattern length: ${length} steps`);
  });

  // Scale mode
  scaleModeSelect?.addEventListener('change', () => {
    const scale = scaleModeSelect.value;
    engine.setScale(scale);
    setStatus(`Scale: ${scale}`);
  });

  // Play/Stop
  playToggleBtn?.addEventListener('click', () => {
    if (engine.isPlaying()) {
      engine.stopSequencer();
      playToggleBtn.textContent = 'Play';
      setStatus('Stopped');
    } else {
      engine.startSequencer();
      playToggleBtn.textContent = 'Stop';
      setStatus('Playing pattern');
    }
  });

  // BPM
  bpmInput?.addEventListener('input', () => {
    const bpm = Number(bpmInput.value);
    if (!Number.isNaN(bpm) && bpm > 0) {
      engine.setBpm(bpm);
      setStatus(`Tempo set to ${bpm} BPM`);
    }
  });
}

function setStatus(message) {
  const status = document.getElementById('status');
  if (status) status.textContent = message;
}

// Step indicator
function updateStepIndicator(step) {
  currentStep = step;
  const container = document.getElementById('sequencer');
  if (!container) return;

  container.querySelectorAll('.step--playing').forEach((el) => {
    el.classList.remove('step--playing');
  });

  if (step >= 0 && step < STEPS) {
    container.querySelectorAll(`.step[data-index="${step}"]`).forEach((el) => {
      el.classList.add('step--playing');
    });

    // Light up voice LEDs
    VOICES.forEach((voice) => {
      const track = pattern[voice.id];
      const led = document.querySelector(`.voice-panel-led[data-voice-id="${voice.id}"]`);
      if (led) {
        const stepData = track?.[step];
        if (stepData && stepData.velocity > 0) {
          led.classList.add('active');
          setTimeout(() => led.classList.remove('active'), 100);
        }
      }
    });
  }

  updateStepPageIndicator(step);
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

    switch (e.code) {
      case 'Space': {
        e.preventDefault();
        const playBtn = document.getElementById('play-toggle');
        if (engine.isPlaying()) {
          engine.stopSequencer();
          if (playBtn) playBtn.textContent = 'Play';
          setStatus('Stopped');
        } else {
          engine.startSequencer();
          if (playBtn) playBtn.textContent = 'Stop';
          setStatus('Playing pattern');
        }
        break;
      }
      case 'Digit1': engine.trigger('kick', 1); break;
      case 'Digit2': engine.trigger('snare', 1); break;
      case 'Digit3': engine.trigger('clap', 1); break;
      case 'Digit4': engine.trigger('rimshot', 1); break;
      case 'Digit5': engine.trigger('ltom', 1); break;
      case 'Digit6': engine.trigger('mtom', 1); break;
      case 'Digit7': engine.trigger('htom', 1); break;
      case 'Digit8': engine.trigger('ch', 1); break;
      case 'Digit9': engine.trigger('oh', 1); break;
      case 'Digit0': engine.trigger('crash', 1); break;
    }
  });
}

// Mobile step page toggle
function setupStepPageToggle() {
  const buttons = document.querySelectorAll('.step-page-btn');
  const sequencer = document.getElementById('sequencer');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (!page || !sequencer) return;
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (page === '2') {
        sequencer.classList.add('page-2');
      } else {
        sequencer.classList.remove('page-2');
      }
    });
  });
}

function updateStepPageIndicator(step) {
  const btn1 = document.querySelector('.step-page-btn[data-page="1"]');
  const btn2 = document.querySelector('.step-page-btn[data-page="2"]');
  if (btn1 && btn2) {
    btn1.classList.toggle('has-playing', step >= 0 && step < 8);
    btn2.classList.toggle('has-playing', step >= 8 && step < 16);
  }
}

// Export/Import
function exportPatternJSON() {
  const bpmInput = document.getElementById('bpm');
  const swingInput = document.getElementById('swing');
  const accentInput = document.getElementById('accent');

  const exportData = {
    format: 'jambot-jt90',
    version: 1,
    exportedAt: new Date().toISOString(),
    bpm: bpmInput ? Number(bpmInput.value) : 128,
    swing: swingInput ? Number(swingInput.value) : 0,
    accent: accentInput ? Number(accentInput.value) : 100,
    pattern: {},
    voiceParams: engine.getAllVoiceParams(),
  };

  VOICES.forEach((voice) => {
    const track = pattern[voice.id];
    if (track) {
      exportData.pattern[voice.id] = track.map(step => ({
        velocity: step.velocity,
        accent: step.accent || false
      }));
    }
  });

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jt90-pattern-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  setStatus('Pattern exported to JSON');
}

function importPatternJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (data.format !== 'jambot-jt90') {
        throw new Error('Invalid format: expected jambot-jt90');
      }

      // Load pattern
      if (data.pattern) {
        VOICES.forEach((voice) => {
          const importedTrack = data.pattern[voice.id];
          const track = ensureTrack(voice.id);
          if (importedTrack && Array.isArray(importedTrack)) {
            for (let i = 0; i < STEPS; i++) {
              const step = importedTrack[i];
              track[i] = step ? { velocity: step.velocity ?? 0, accent: step.accent ?? false } : { velocity: 0, accent: false };
            }
          }
        });
        commitPattern();
        refreshGrid();
      }

      // Load voice params
      if (data.voiceParams) {
        loadKit({ voiceParams: data.voiceParams });
      }

      // Load settings
      const bpmInput = document.getElementById('bpm');
      const swingInput = document.getElementById('swing');
      const swingValue = document.getElementById('swing-value');
      const accentInput = document.getElementById('accent');
      const accentValue = document.getElementById('accent-value');

      if (data.bpm && bpmInput) {
        bpmInput.value = data.bpm;
        engine.setBpm(data.bpm);
      }
      if (data.swing !== undefined && swingInput) {
        swingInput.value = data.swing;
        engine.setSwing(data.swing / 100);
        if (swingValue) swingValue.textContent = `${data.swing}%`;
      }
      if (data.accent !== undefined && accentInput) {
        accentInput.value = data.accent;
        engine.setAccentLevel(data.accent / 100);
        if (accentValue) accentValue.textContent = `${data.accent}%`;
      }

      setStatus(`Pattern imported: ${file.name}`);
    } catch (err) {
      console.error('Import failed:', err);
      setStatus(`Import failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function setupExportImport() {
  const shareBtn = document.getElementById('share-btn');
  const shareModal = document.getElementById('share-modal');
  const shareClose = shareModal?.querySelector('.share-modal-close');
  const exportWavBtn = document.getElementById('export-wav');
  const exportJsonBtn = document.getElementById('export-json');
  const importBtn = document.getElementById('import-json');
  const importFile = document.getElementById('import-file');

  shareBtn?.addEventListener('click', () => shareModal?.classList.add('active'));
  shareClose?.addEventListener('click', () => shareModal?.classList.remove('active'));
  shareModal?.addEventListener('click', (e) => {
    if (e.target === shareModal) shareModal.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shareModal?.classList.contains('active')) {
      shareModal.classList.remove('active');
    }
  });

  exportWavBtn?.addEventListener('click', async () => {
    const strongEl = exportWavBtn.querySelector('strong');
    const originalText = strongEl?.textContent || 'Export WAV';
    if (strongEl) strongEl.textContent = 'Rendering...';
    exportWavBtn.disabled = true;

    try {
      const bpmInput = document.getElementById('bpm');
      const bpm = bpmInput ? Number(bpmInput.value) || 128 : 128;
      const buffer = await engine.renderPattern({ bars: 2, bpm });
      const blob = await engine.audioBufferToBlob(buffer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jt90-pattern-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      shareModal?.classList.remove('active');
      setStatus('WAV exported successfully');
    } catch (err) {
      console.error('WAV export failed:', err);
      setStatus('Export failed: ' + err.message);
    }

    if (strongEl) strongEl.textContent = originalText;
    exportWavBtn.disabled = false;
  });

  exportJsonBtn?.addEventListener('click', () => {
    exportPatternJSON();
    shareModal?.classList.remove('active');
  });

  importBtn?.addEventListener('click', () => importFile?.click());

  importFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importPatternJSON(file);
      shareModal?.classList.remove('active');
      e.target.value = '';
    }
  });
}

// Manage Patterns Modal
function showManageModal() {
  const modal = document.getElementById('manage-modal');
  const list = document.getElementById('manage-patterns-list');
  const emptyMsg = document.getElementById('manage-empty');
  if (!modal || !list) return;

  const saved = getSavedPatterns();
  list.innerHTML = '';

  if (saved.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
  } else {
    if (emptyMsg) emptyMsg.style.display = 'none';
    saved.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'manage-pattern-item';
      li.innerHTML = `
        <span class="manage-pattern-name">${escapeHtml(p.name)}</span>
        <span class="manage-pattern-bpm">${p.bpm} BPM</span>
        <div class="manage-pattern-actions">
          <button class="overwrite-btn" title="Overwrite with current">+</button>
          <button class="rename-btn" title="Rename">R</button>
          <button class="delete-btn" title="Delete">X</button>
        </div>
      `;

      li.querySelector('.overwrite-btn').addEventListener('click', async () => {
        if (confirm(`Overwrite "${p.name}" with current pattern?`)) {
          try {
            const bpmInput = document.getElementById('bpm');
            const bpm = bpmInput ? Number(bpmInput.value) || 128 : 128;
            await deleteSavedPattern(p.name);
            await savePattern(p.name, bpm);
            await populatePatterns();
            showManageModal();
            setStatus(`Updated "${p.name}"`);
          } catch (e) {
            setStatus(`Update failed: ${e.message}`);
          }
        }
      });

      li.querySelector('.rename-btn').addEventListener('click', async () => {
        const newName = prompt(`Rename "${p.name}" to:`, p.name);
        if (newName && newName.trim() && newName.trim() !== p.name) {
          try {
            await savePattern(newName.trim(), p.bpm, p.pattern);
            await deleteSavedPattern(p.name);
            await populatePatterns();
            showManageModal();
            setStatus(`Renamed to "${newName.trim()}"`);
          } catch (e) {
            setStatus(`Rename failed: ${e.message}`);
          }
        }
      });

      li.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Delete "${p.name}"?`)) {
          try {
            await deleteSavedPattern(p.name);
            await populatePatterns();
            showManageModal();
            setStatus(`Deleted "${p.name}"`);
          } catch (e) {
            setStatus(`Delete failed: ${e.message}`);
          }
        }
      });

      list.appendChild(li);
    });
  }

  modal.classList.add('active');
}

function hideManageModal() {
  const modal = document.getElementById('manage-modal');
  if (modal) modal.classList.remove('active');
}

function setupManageModal() {
  const modal = document.getElementById('manage-modal');
  const closeBtn = modal?.querySelector('.manage-modal-close');

  closeBtn?.addEventListener('click', hideManageModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) hideManageModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      hideManageModal();
    }
  });
}

// Manage Kits Modal
function showManageKitsModal() {
  const modal = document.getElementById('manage-kits-modal');
  const list = document.getElementById('manage-kits-list');
  const emptyMsg = document.getElementById('manage-kits-empty');
  if (!modal || !list) return;

  const saved = getSavedKits();
  list.innerHTML = '';

  if (saved.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
  } else {
    if (emptyMsg) emptyMsg.style.display = 'none';
    saved.forEach((k) => {
      const li = document.createElement('li');
      li.className = 'manage-pattern-item';
      li.innerHTML = `
        <span class="manage-pattern-name">${escapeHtml(k.name)}</span>
        <span class="manage-pattern-bpm">Kit</span>
        <div class="manage-pattern-actions">
          <button class="overwrite-btn" title="Overwrite with current">+</button>
          <button class="rename-btn" title="Rename">R</button>
          <button class="delete-btn" title="Delete">X</button>
        </div>
      `;

      li.querySelector('.overwrite-btn').addEventListener('click', async () => {
        if (confirm(`Overwrite "${k.name}" with current kit settings?`)) {
          try {
            await deleteSavedKit(k.name);
            await saveKit(k.name);
            await populateKits();
            showManageKitsModal();
            setStatus(`Updated kit "${k.name}"`);
          } catch (e) {
            setStatus(`Update failed: ${e.message}`);
          }
        }
      });

      li.querySelector('.rename-btn').addEventListener('click', async () => {
        const newName = prompt(`Rename "${k.name}" to:`, k.name);
        if (newName && newName.trim() && newName.trim() !== k.name) {
          try {
            await saveKit(newName.trim(), { voiceParams: k.voice_params || k.voiceParams });
            await deleteSavedKit(k.name);
            await populateKits();
            showManageKitsModal();
            setStatus(`Renamed to "${newName.trim()}"`);
          } catch (e) {
            setStatus(`Rename failed: ${e.message}`);
          }
        }
      });

      li.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Delete kit "${k.name}"?`)) {
          try {
            await deleteSavedKit(k.name);
            await populateKits();
            showManageKitsModal();
            setStatus(`Deleted kit "${k.name}"`);
          } catch (e) {
            setStatus(`Delete failed: ${e.message}`);
          }
        }
      });

      list.appendChild(li);
    });
  }

  modal.classList.add('active');
}

function hideManageKitsModal() {
  const modal = document.getElementById('manage-kits-modal');
  if (modal) modal.classList.remove('active');
}

function setupManageKitsModal() {
  const modal = document.getElementById('manage-kits-modal');
  const closeBtn = modal?.querySelector('.manage-modal-close');

  closeBtn?.addEventListener('click', hideManageKitsModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) hideManageKitsModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      hideManageKitsModal();
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initPattern();
  renderGrid();
  renderVoiceParams();
  setupControls();
  setupKeyboardShortcuts();
  setupStepPageToggle();
  setupExportImport();
  setupManageModal();
  setupManageKitsModal();

  engine.onStepChange = updateStepIndicator;

  // Load default kit and pattern
  const defaultKit = JT90_KITS.find(k => k.id === 'default');
  if (defaultKit) loadKit(defaultKit);

  const housePattern = JT90_SEQUENCES.find(s => s.id === 'house');
  if (housePattern) loadSequence(housePattern);

  setStatus('Ready - Space to play, 1-0 for triggers');
});
