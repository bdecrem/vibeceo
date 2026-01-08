/**
 * R9-DS Sampler UI
 *
 * A sample-based drum machine with:
 * - Kit selector
 * - 10 sample slots
 * - 6 knobs per slot (level, tune, attack, decay, filter, pan)
 * - 16-step sequencer
 */

import { R9DSEngine } from '../../sampler/engine.js';

const STEPS = 16;
const STORAGE_KEY = 'r9ds-saved-patterns';
const PATTERN_ID = 'web-ui';

// Pattern state
const pattern = {};
let engine = null;
let currentStep = -1;

// Voice list (will be populated from kit)
let VOICES = [];

function ensureTrack(voiceId) {
  if (!pattern[voiceId]) {
    pattern[voiceId] = Array.from({ length: STEPS }, () => ({ velocity: 0 }));
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
  engine.setPattern(PATTERN_ID, pattern);
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
}

function updateStepButton(button, velocity) {
  button.classList.toggle('step--on', velocity > 0);
  button.classList.toggle('step--accent', velocity >= 1);
  button.setAttribute('data-level', velocity.toFixed(1));
}

function renderGrid() {
  const container = document.getElementById('sequencer');
  if (!container) return;

  container.innerHTML = '';

  VOICES.forEach((voice) => {
    const row = document.createElement('div');
    row.className = 'voice-row';
    row.dataset.voiceId = voice.id;

    // Full label (desktop) - clickable for mute/solo
    const label = document.createElement('button');
    label.className = 'voice-label';
    label.textContent = voice.label;
    label.dataset.voiceId = voice.id;
    label.title = 'Click: mute, Click again: solo';
    label.addEventListener('click', (e) => {
      e.preventDefault();
      handleVoiceLabelClick(voice.id);
    });
    row.appendChild(label);

    // Short label (mobile) - also clickable
    const shortLabel = document.createElement('button');
    shortLabel.className = 'voice-label-short';
    shortLabel.textContent = voice.shortLabel;
    shortLabel.dataset.voiceId = voice.id;
    shortLabel.addEventListener('click', (e) => {
      e.preventDefault();
      handleVoiceLabelClick(voice.id);
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

function handleVoiceLabelClick(voiceId) {
  const newState = engine.cycleVoiceState(voiceId);
  updateVoiceLabelState(voiceId, newState);

  const hasSolo = VOICES.some(v => engine.getVoiceState(v.id) === 'solo');
  if (hasSolo || newState === 'normal') {
    VOICES.forEach(v => {
      const state = engine.getVoiceState(v.id);
      updateVoiceLabelState(v.id, state);
    });
  }
}

function updateVoiceLabelState(voiceId, state) {
  const labels = document.querySelectorAll(
    `.voice-label[data-voice-id="${voiceId}"], .voice-label-short[data-voice-id="${voiceId}"]`
  );
  const row = document.querySelector(`.voice-row[data-voice-id="${voiceId}"]`);

  labels.forEach(label => {
    label.classList.remove('muted', 'solo', 'dimmed');
    if (state === 'muted') {
      label.classList.add('muted');
    } else if (state === 'solo') {
      label.classList.add('solo');
    }
  });

  if (row) {
    const shouldPlay = engine.shouldVoicePlay(voiceId);
    row.classList.toggle('voice-row--dimmed', !shouldPlay);
  }
}

// === Knob Handling ===

function valueToRotation(value, min, max) {
  const normalized = (value - min) / (max - min);
  return -135 + normalized * 270;
}

function formatParamValue(value, descriptor) {
  if (descriptor.label === 'Tune') {
    const rounded = Math.round(value);
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  }
  if (descriptor.label === 'Pan') {
    if (value < -0.1) return 'L';
    if (value > 0.1) return 'R';
    return 'C';
  }
  if (descriptor.label === 'Filter') {
    // Show as approximate frequency
    const freq = 100 * Math.pow(200, value);
    if (freq >= 10000) return `${Math.round(freq / 1000)}k`;
    if (freq >= 1000) return `${(freq / 1000).toFixed(1)}k`;
    return Math.round(freq).toString();
  }
  // For 0-1 range, show as percentage
  return Math.round(value * 100).toString();
}

let activeKnob = null;

function startKnobDrag(clientY, knobEl, voiceId, paramId, descriptor, valueDisplay) {
  const min = descriptor.min;
  const max = descriptor.max;
  const currentRotation = parseFloat(knobEl.style.getPropertyValue('--rotation') || '0');
  const currentValue = min + ((currentRotation + 135) / 270) * (max - min);

  activeKnob = {
    element: knobEl,
    startY: clientY,
    startValue: currentValue,
    min,
    max,
    voiceId,
    paramId,
    valueDisplay,
    descriptor,
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

function renderVoiceParams() {
  const container = document.getElementById('voice-params');
  if (!container) return;

  container.innerHTML = '';

  const descriptors = engine.getVoiceParameterDescriptors();

  VOICES.forEach((voice) => {
    const params = descriptors[voice.id];
    if (!params) return;

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
    panel.appendChild(header);

    // Knobs container
    const knobsContainer = document.createElement('div');
    knobsContainer.className = 'knobs-container';

    // Create 6 knobs
    const paramOrder = ['level', 'tune', 'attack', 'decay', 'filter', 'pan'];

    paramOrder.forEach((paramId) => {
      const descriptor = params[paramId];
      if (!descriptor) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'knob-wrapper';

      const knob = document.createElement('div');
      knob.className = 'knob';

      const defaultValue = descriptor.default;
      const initialRotation = valueToRotation(defaultValue, descriptor.min, descriptor.max);
      knob.style.setProperty('--rotation', `${initialRotation}`);
      knob.style.transform = `rotate(${initialRotation}deg)`;

      const label = document.createElement('span');
      label.className = 'knob-label';
      label.textContent = descriptor.label;

      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'knob-value';
      valueDisplay.textContent = formatParamValue(defaultValue, descriptor);

      // Mouse drag
      knob.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startKnobDrag(e.clientY, knob, voice.id, paramId, descriptor, valueDisplay);
      });

      // Touch drag
      knob.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          startKnobDrag(e.touches[0].clientY, knob, voice.id, paramId, descriptor, valueDisplay);
        }
      }, { passive: false });

      // Double-click to reset
      knob.addEventListener('dblclick', () => {
        const rotation = valueToRotation(defaultValue, descriptor.min, descriptor.max);
        knob.style.setProperty('--rotation', `${rotation}`);
        knob.style.transform = `rotate(${rotation}deg)`;
        engine.setVoiceParameter(voice.id, paramId, defaultValue);
        valueDisplay.textContent = formatParamValue(defaultValue, descriptor);
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

// === Kit Loading ===

async function loadKit(kitId) {
  setStatus(`Loading ${kitId} kit...`);

  try {
    const kit = await engine.loadKit(kitId);

    // Update VOICES list from kit
    VOICES = kit.slots.map((slot, i) => ({
      id: slot.id,
      label: slot.name,
      shortLabel: slot.short
    }));

    // Re-initialize pattern for new voices
    initPattern();
    renderGrid();
    renderVoiceParams();

    setStatus(`Loaded "${kit.name}"`);
  } catch (e) {
    setStatus(`Error loading kit: ${e.message}`);
  }
}

async function populateKitSelector() {
  const kitSelect = document.getElementById('kit-select');
  if (!kitSelect) return;

  const kits = await engine.getAvailableKits();
  kitSelect.innerHTML = '';

  kits.forEach((kit) => {
    const option = document.createElement('option');
    option.value = kit.id;
    option.textContent = kit.name;
    kitSelect.appendChild(option);
  });
}

// === Controls ===

async function setupControls() {
  const playToggleBtn = document.getElementById('play-toggle');
  const bpmInput = document.getElementById('bpm');
  const kitSelect = document.getElementById('kit-select');
  const swingInput = document.getElementById('swing');
  const swingValue = document.getElementById('swing-value');

  // Kit selector
  await populateKitSelector();
  kitSelect?.addEventListener('change', () => {
    const kitId = kitSelect.value;
    if (kitId) {
      loadKit(kitId);
    }
  });

  // Swing control
  swingInput?.addEventListener('input', () => {
    const swing = Number(swingInput.value) / 100;
    engine.setSwing(swing);
    if (swingValue) {
      swingValue.textContent = `${swingInput.value}%`;
    }
  });

  // Play/Stop toggle
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
  if (status) {
    status.textContent = message;
  }
}

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

    // Light up LEDs
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

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
      return;
    }

    if (e.code === 'Space') {
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
    }

    // Number keys 1-0 trigger samples
    const keyMap = {
      'Digit1': 's1', 'Digit2': 's2', 'Digit3': 's3', 'Digit4': 's4', 'Digit5': 's5',
      'Digit6': 's6', 'Digit7': 's7', 'Digit8': 's8', 'Digit9': 's9', 'Digit0': 's10'
    };

    if (keyMap[e.code]) {
      engine.trigger(keyMap[e.code], 1);
    }
  });
}

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

// === Init ===

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Create engine
    console.log('Creating R9DSEngine...');
    engine = new R9DSEngine();
    console.log('Engine created');

    // Setup controls first
    console.log('Setting up controls...');
    await setupControls();
    setupKeyboardShortcuts();
    setupStepPageToggle();

    // Connect step change callback
    engine.onStepChange = updateStepIndicator;

    // Load default kit (first in selector, or 'amber')
    const kitSelect = document.getElementById('kit-select');
    const defaultKit = kitSelect?.value || 'amber';
    console.log('Loading kit:', defaultKit);
    await loadKit(defaultKit);

    setStatus('Ready — tap steps to program, press SPACE to play. Keys 1-0 trigger sounds.');
  } catch (e) {
    console.error('R9DS init error:', e);
    setStatus('Error: ' + e.message);
  }
});
