import { TR909Engine, } from '../../machines/tr909/engine.js';
import { TR909_PRESETS } from '../../machines/tr909/presets.js';
const STEPS = 16;
const pattern = {};
const engine = new TR909Engine();
const PATTERN_ID = 'web-ui';
const STORAGE_KEY = 'tr909-saved-patterns';
// Track current step for visualization
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
const defaultPattern = {
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    clap: [],
    rimshot: [],
    ltom: [],
    mtom: [],
    htom: [],
    ch: [0, 2, 4, 6, 8, 10, 12, 14],
    oh: [6, 14],
    crash: [0],
    ride: [],
};
function ensureTrack(voiceId) {
    if (!pattern[voiceId]) {
        pattern[voiceId] = Array.from({ length: STEPS }, () => ({ velocity: 0 }));
    }
    return pattern[voiceId];
}
function initPattern() {
    VOICES.forEach((voice) => {
        const track = ensureTrack(voice.id);
        track.forEach((step, index) => {
            step.velocity = defaultPattern[voice.id]?.includes(index) ? 1 : 0;
            step.accent = false;
        });
    });
    commitPattern();
}
function commitPattern() {
    engine.setPattern(PATTERN_ID, pattern);
}
function nextVelocity(value) {
    if (value <= 0)
        return 0.6;
    if (value < 1)
        return 1;
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
    if (!container)
        return;
    container.innerHTML = '';
    VOICES.forEach((voice) => {
        const row = document.createElement('div');
        row.className = 'voice-row';
        row.dataset.voiceId = voice.id;
        // Full label (desktop)
        const label = document.createElement('span');
        label.className = 'voice-label';
        label.textContent = voice.label;
        row.appendChild(label);
        // Short label (mobile)
        const shortLabel = document.createElement('span');
        shortLabel.className = 'voice-label-short';
        shortLabel.textContent = voice.shortLabel;
        row.appendChild(shortLabel);
        const track = ensureTrack(voice.id);
        for (let i = 0; i < STEPS; i += 1) {
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
function formatParamValue(value, descriptor) {
    const unit = descriptor.range?.unit ?? '';
    if (unit === 'cents' || unit === 'semitones') {
        const rounded = Math.round(value);
        return rounded > 0 ? `+${rounded}` : `${rounded}`;
    }
    if (unit === 's') {
        return value.toFixed(2);
    }
    if (unit === 'ms') {
        return value.toFixed(0);
    }
    // For 0-1 range, show as percentage
    if (descriptor.range?.max === 1 && descriptor.range?.min === 0) {
        return Math.round(value * 100).toString();
    }
    return value.toFixed(1);
}
// Convert value to knob rotation (-135° to 135°)
function valueToRotation(value, min, max) {
    const normalized = (value - min) / (max - min);
    return -135 + normalized * 270;
}
// Knob drag state
let activeKnob = null;
function handleKnobMouseDown(e, knobEl, voiceId, param, valueDisplay) {
    e.preventDefault();
    const min = param.range?.min ?? 0;
    const max = param.range?.max ?? 1;
    const step = param.range?.step ?? 0.01;
    const currentRotation = parseFloat(knobEl.style.getPropertyValue('--rotation') || '0');
    const currentValue = min + ((currentRotation + 135) / 270) * (max - min);
    activeKnob = {
        element: knobEl,
        startY: e.clientY,
        startValue: currentValue,
        min,
        max,
        step,
        voiceId,
        paramId: param.id,
        valueDisplay,
        descriptor: param,
    };
    document.body.style.cursor = 'ns-resize';
}
function handleKnobMouseMove(e) {
    if (!activeKnob)
        return;
    const deltaY = activeKnob.startY - e.clientY;
    const range = activeKnob.max - activeKnob.min;
    const sensitivity = range / 150; // 150px drag = full range
    let newValue = activeKnob.startValue + deltaY * sensitivity;
    // Clamp and quantize
    newValue = Math.max(activeKnob.min, Math.min(activeKnob.max, newValue));
    newValue = Math.round(newValue / activeKnob.step) * activeKnob.step;
    // Update knob rotation
    const rotation = valueToRotation(newValue, activeKnob.min, activeKnob.max);
    activeKnob.element.style.setProperty('--rotation', `${rotation}`);
    activeKnob.element.style.transform = `rotate(${rotation}deg)`;
    // Update engine and display
    engine.setVoiceParameter(activeKnob.voiceId, activeKnob.paramId, newValue);
    activeKnob.valueDisplay.textContent = formatParamValue(newValue, activeKnob.descriptor);
}
function handleKnobMouseUp() {
    if (activeKnob) {
        activeKnob = null;
        document.body.style.cursor = '';
    }
}
// Set up global mouse handlers for knob dragging
document.addEventListener('mousemove', handleKnobMouseMove);
document.addEventListener('mouseup', handleKnobMouseUp);
function renderVoiceParams() {
    const container = document.getElementById('voice-params');
    if (!container)
        return;
    container.innerHTML = '';
    const descriptors = engine.getVoiceParameterDescriptors();
    VOICES.forEach((voice) => {
        const params = descriptors[voice.id];
        if (!params || params.length === 0)
            return;
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
        // Add sample/synth toggle for sample-capable voices
        if (engine.isSampleCapable(voice.id)) {
            const toggle = document.createElement('button');
            toggle.className = 'sample-toggle';
            toggle.dataset.voiceId = voice.id;
            toggle.title = 'Toggle Sample/Synth';
            toggle.innerHTML = '♪'; // Musical note icon
            toggle.setAttribute('aria-label', 'Toggle between sample and synthesized sound');
            // Set initial state (synth by default)
            const useSample = engine.getVoiceUseSample(voice.id);
            toggle.classList.toggle('sample-active', useSample);
            toggle.addEventListener('click', async () => {
                const currentUseSample = engine.getVoiceUseSample(voice.id);
                const newUseSample = !currentUseSample;
                // If switching to sample mode, ensure samples are loaded
                if (newUseSample) {
                    await engine.loadRealSamples();
                }
                engine.setVoiceUseSample(voice.id, newUseSample);
                toggle.classList.toggle('sample-active', newUseSample);
                // Preview the sound
                engine.trigger(voice.id, 0.8);
            });
            header.appendChild(toggle);
        }
        panel.appendChild(header);
        // Knobs container
        const knobsContainer = document.createElement('div');
        knobsContainer.className = 'knobs-container';
        // Create knobs for each parameter
        params.forEach((param) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'knob-wrapper';
            const knob = document.createElement('div');
            knob.className = 'knob';
            const initialRotation = valueToRotation(param.defaultValue, param.range?.min ?? 0, param.range?.max ?? 1);
            knob.style.setProperty('--rotation', `${initialRotation}`);
            knob.style.transform = `rotate(${initialRotation}deg)`;
            const label = document.createElement('span');
            label.className = 'knob-label';
            label.textContent = param.label;
            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'knob-value';
            valueDisplay.textContent = formatParamValue(param.defaultValue, param);
            // Knob interaction
            knob.addEventListener('mousedown', (e) => {
                handleKnobMouseDown(e, knob, voice.id, param, valueDisplay);
            });
            // Double-click to reset
            knob.addEventListener('dblclick', () => {
                const rotation = valueToRotation(param.defaultValue, param.range?.min ?? 0, param.range?.max ?? 1);
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
function loadPreset(preset) {
    // Copy preset pattern into our mutable pattern object
    VOICES.forEach((voice) => {
        const presetTrack = preset.pattern[voice.id];
        const track = ensureTrack(voice.id);
        if (presetTrack && Array.isArray(presetTrack)) {
            for (let i = 0; i < STEPS; i++) {
                const step = presetTrack[i];
                if (step) {
                    track[i] = { ...step };
                }
                else {
                    track[i] = { velocity: 0, accent: false };
                }
            }
        }
        else {
            // Clear track if not in preset
            for (let i = 0; i < STEPS; i++) {
                track[i] = { velocity: 0, accent: false };
            }
        }
    });
    commitPattern();
}
function refreshGrid() {
    // Update all step buttons to reflect current pattern
    const container = document.getElementById('sequencer');
    if (!container)
        return;
    VOICES.forEach((voice) => {
        const track = pattern[voice.id];
        if (!track)
            return;
        const row = container.querySelector(`[data-voice-id="${voice.id}"]`);
        if (!row)
            return;
        const buttons = row.querySelectorAll('.step');
        buttons.forEach((btn, i) => {
            const step = track[i];
            if (step && btn instanceof HTMLButtonElement) {
                updateStepButton(btn, step.velocity);
            }
        });
    });
}
function populatePresets() {
    const presetSelect = document.getElementById('preset');
    if (!presetSelect)
        return;
    TR909_PRESETS.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = `${preset.name} (${preset.bpm} BPM)`;
        presetSelect.appendChild(option);
    });
}
function setupControls() {
    const playToggleBtn = document.getElementById('play-toggle');
    const bpmInput = document.getElementById('bpm');
    const presetSelect = document.getElementById('preset');
    const swingInput = document.getElementById('swing');
    const swingValue = document.getElementById('swing-value');
    const flamInput = document.getElementById('flam');
    const flamValue = document.getElementById('flam-value');
    const savedPatternsSelect = document.getElementById('saved-patterns');
    const saveBtn = document.getElementById('save-pattern');
    const deleteBtn = document.getElementById('delete-pattern');
    // Populate preset dropdown
    populatePresets();
    // Populate saved patterns
    populateSavedPatterns();
    // Swing control
    swingInput?.addEventListener('input', () => {
        const swing = Number(swingInput.value) / 100;
        engine.setSwing(swing);
        if (swingValue) {
            swingValue.textContent = `${swingInput.value}%`;
        }
    });
    // Flam control
    flamInput?.addEventListener('input', () => {
        const flam = Number(flamInput.value) / 100;
        engine.setFlam(flam);
        if (flamValue) {
            flamValue.textContent = `${flamInput.value}%`;
        }
    });
    // Save pattern
    saveBtn?.addEventListener('click', () => {
        const name = prompt('Enter pattern name:');
        if (name && name.trim()) {
            const bpm = bpmInput ? Number(bpmInput.value) || 128 : 128;
            savePattern(name.trim(), bpm);
            populateSavedPatterns();
            setStatus(`Pattern "${name.trim()}" saved.`);
        }
    });
    // Load saved pattern
    savedPatternsSelect?.addEventListener('change', () => {
        const name = savedPatternsSelect.value;
        if (!name)
            return;
        const saved = loadSavedPattern(name);
        if (saved) {
            // Load pattern into our pattern object
            VOICES.forEach((voice) => {
                const savedTrack = saved.pattern[voice.id];
                const track = ensureTrack(voice.id);
                if (savedTrack && Array.isArray(savedTrack)) {
                    for (let i = 0; i < STEPS; i++) {
                        const step = savedTrack[i];
                        track[i] = step ? { ...step } : { velocity: 0, accent: false };
                    }
                }
                else {
                    for (let i = 0; i < STEPS; i++) {
                        track[i] = { velocity: 0, accent: false };
                    }
                }
            });
            commitPattern();
            refreshGrid();
            // Update BPM
            if (bpmInput) {
                bpmInput.value = String(saved.bpm);
                engine.setBpm(saved.bpm);
            }
            // Clear preset selection
            if (presetSelect) {
                presetSelect.value = '';
            }
            setStatus(`Loaded saved pattern "${name}"`);
        }
    });
    // Delete saved pattern
    deleteBtn?.addEventListener('click', () => {
        const name = savedPatternsSelect?.value;
        if (name && confirm(`Delete pattern "${name}"?`)) {
            deleteSavedPattern(name);
            populateSavedPatterns();
            setStatus(`Pattern "${name}" deleted.`);
        }
    });
    // Handle preset selection
    presetSelect?.addEventListener('change', () => {
        const presetId = presetSelect.value;
        if (!presetId) {
            setStatus('Custom pattern mode');
            return;
        }
        const preset = TR909_PRESETS.find(p => p.id === presetId);
        if (preset) {
            loadPreset(preset);
            refreshGrid();
            // Update BPM to match preset
            if (bpmInput) {
                bpmInput.value = String(preset.bpm);
                engine.setBpm(preset.bpm);
            }
            setStatus(`Loaded "${preset.name}" — ${preset.description}`);
        }
    });
    // Play/Stop toggle button
    playToggleBtn?.addEventListener('click', () => {
        if (engine.isPlaying()) {
            engine.stopSequencer();
            playToggleBtn.textContent = 'Play';
            setStatus('Stopped');
        }
        else {
            engine.startSequencer();
            playToggleBtn.textContent = 'Stop';
            setStatus('Playing pattern');
        }
    });
    bpmInput?.addEventListener('input', () => {
        const bpm = Number(bpmInput.value);
        if (!Number.isNaN(bpm) && bpm > 0) {
            engine.setBpm(bpm);
            setStatus(`Tempo set to ${bpm} BPM`);
            // Clear preset selection when BPM is manually changed
            if (presetSelect) {
                presetSelect.value = '';
            }
        }
    });
}
function setStatus(message) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
    }
}
// Step indicator: highlight current step during playback
function updateStepIndicator(step) {
    currentStep = step;
    const container = document.getElementById('sequencer');
    if (!container)
        return;
    // Remove previous playing state from all steps
    container.querySelectorAll('.step--playing').forEach((el) => {
        el.classList.remove('step--playing');
    });
    // Add playing state to current step column (all voices)
    if (step >= 0 && step < STEPS) {
        container.querySelectorAll(`.step[data-index="${step}"]`).forEach((el) => {
            el.classList.add('step--playing');
        });
        // Also light up voice panel LEDs when that voice triggers
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
    // Update mobile page indicator
    updateStepPageIndicator(step);
}
function getSavedPatterns() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }
    catch {
        return [];
    }
}
function savePattern(name, bpm) {
    const saved = getSavedPatterns();
    // Deep clone pattern
    const patternCopy = {};
    for (const [voiceId, track] of Object.entries(pattern)) {
        patternCopy[voiceId] = track.map((step) => ({ ...step }));
    }
    // Check if pattern with same name exists
    const existing = saved.findIndex((p) => p.name === name);
    if (existing >= 0) {
        saved[existing] = { name, pattern: patternCopy, bpm };
    }
    else {
        saved.push({ name, pattern: patternCopy, bpm });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}
function loadSavedPattern(name) {
    const saved = getSavedPatterns();
    return saved.find((p) => p.name === name);
}
function deleteSavedPattern(name) {
    const saved = getSavedPatterns().filter((p) => p.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}
function populateSavedPatterns() {
    const savedSelect = document.getElementById('saved-patterns');
    if (!savedSelect)
        return;
    // Clear existing options except first
    while (savedSelect.options.length > 1) {
        savedSelect.remove(1);
    }
    const saved = getSavedPatterns();
    saved.forEach((p) => {
        const option = document.createElement('option');
        option.value = p.name;
        option.textContent = `${p.name} (${p.bpm} BPM)`;
        savedSelect.appendChild(option);
    });
}
// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
            return;
        }
        switch (e.code) {
            case 'Space': {
                e.preventDefault();
                const playBtn = document.getElementById('play-toggle');
                if (engine.isPlaying()) {
                    engine.stopSequencer();
                    if (playBtn)
                        playBtn.textContent = 'Play';
                    setStatus('Stopped');
                }
                else {
                    engine.startSequencer();
                    if (playBtn)
                        playBtn.textContent = 'Stop';
                    setStatus('Playing pattern');
                }
                break;
            }
            // Number keys 1-9, 0 trigger voices
            case 'Digit1':
                engine.trigger('kick', 1);
                break;
            case 'Digit2':
                engine.trigger('snare', 1);
                break;
            case 'Digit3':
                engine.trigger('clap', 1);
                break;
            case 'Digit4':
                engine.trigger('rimshot', 1);
                break;
            case 'Digit5':
                engine.trigger('ltom', 1);
                break;
            case 'Digit6':
                engine.trigger('mtom', 1);
                break;
            case 'Digit7':
                engine.trigger('htom', 1);
                break;
            case 'Digit8':
                engine.trigger('ch', 1);
                break;
            case 'Digit9':
                engine.trigger('oh', 1);
                break;
            case 'Digit0':
                engine.trigger('crash', 1);
                break;
        }
    });
}
function setupPatternTabs() {
    const dots = document.querySelectorAll('.tab-dot');
    const contents = document.querySelectorAll('.tab-content');
    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const tab = dot.dataset.tab;
            if (!tab)
                return;
            // Update dots
            dots.forEach((d) => d.classList.remove('active'));
            dot.classList.add('active');
            // Update content
            contents.forEach((c) => {
                c.classList.toggle('active', c.dataset.tab === tab);
            });
        });
    });
}
// Mobile step page toggle (1-8 / 9-16)
function setupStepPageToggle() {
    const buttons = document.querySelectorAll('.step-page-btn');
    const sequencer = document.getElementById('sequencer');
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (!page || !sequencer)
                return;
            // Update button states
            buttons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            // Toggle sequencer page class
            if (page === '2') {
                sequencer.classList.add('page-2');
            }
            else {
                sequencer.classList.remove('page-2');
            }
        });
    });
}
// Update page toggle buttons to show which has the playing step
function updateStepPageIndicator(step) {
    const btn1 = document.querySelector('.step-page-btn[data-page="1"]');
    const btn2 = document.querySelector('.step-page-btn[data-page="2"]');
    if (btn1 && btn2) {
        btn1.classList.toggle('has-playing', step >= 0 && step < 8);
        btn2.classList.toggle('has-playing', step >= 8 && step < 16);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    initPattern();
    renderGrid();
    renderVoiceParams();
    setupControls();
    setupKeyboardShortcuts();
    setupPatternTabs();
    setupStepPageToggle();
    // Connect step change callback for visualization
    engine.onStepChange = updateStepIndicator;
    setStatus('Ready — tap steps to program, or press SPACE to play. Keys 1-0 trigger sounds.');
});
//# sourceMappingURL=app.js.map