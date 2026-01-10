import { TR909Engine, } from '../../machines/tr909/engine-v3.js';
import { TR909_PRESETS, TR909_KITS, TR909_SEQUENCES } from '../../machines/tr909/presets.js?v=20260110h';
import audioBufferToWav from 'audiobuffer-to-wav';
const STEPS = 16;

// Voice synthesis information for info modal
const VOICE_INFO = {
    kick: {
        e1: 'Sine oscillator with pitch sweep, soft-clipped for warmth.',
        e2: 'Triangle oscillator through analog waveshaper. Circuit-accurate pitch envelope with 100Hz → 50Hz decay.',
    },
    snare: {
        e1: 'Single triangle oscillator with filtered white noise.',
        e2: 'Dual sine oscillators (180Hz + 330Hz) with bridged-T resonance. Noise shares buffer with clap for authentic phasing.',
    },
    clap: {
        e1: 'Four-burst envelope on bandpass-filtered noise.',
        e2: 'Four bursts with randomized timing + reverb tail. Shares noise source with snare.',
    },
    rimshot: {
        e1: 'Single square wave oscillator with rapid decay.',
        e2: 'Three bridged T-network filters at 220/500/1000 Hz create metallic ring. High-passed noise transient.',
    },
    ltom: {
        e1: 'Single sine oscillator with pitch envelope.',
        e2: 'Three oscillators at frequency ratios 1:1.5:2.77. Soft saturation for analog warmth.',
    },
    mtom: {
        e1: 'Single sine oscillator with pitch envelope.',
        e2: 'Three oscillators at frequency ratios 1:1.5:2.77. Soft saturation for analog warmth.',
    },
    htom: {
        e1: 'Single sine oscillator with pitch envelope.',
        e2: 'Three oscillators at frequency ratios 1:1.5:2.77. Soft saturation for analog warmth.',
    },
    ch: {
        e1: 'White noise through highpass filter with fast decay.',
        e2: 'Six square oscillators at inharmonic frequencies (205–1204 Hz). Bandpass filtered for shimmer.',
        sample: 'Real 909 used 6-bit samples. Toggle ♪ for authentic recordings.',
    },
    oh: {
        e1: 'White noise through highpass filter with slow decay.',
        e2: 'Six square oscillators at inharmonic frequencies. Extended envelope for open ring.',
        sample: 'Real 909 used 6-bit samples. Toggle ♪ for authentic recordings.',
    },
    crash: {
        e1: 'Bandpass-filtered noise with long decay.',
        e2: 'Six square oscillators tuned lower (245–1225 Hz) for crash character. Long envelope.',
        sample: 'Real 909 used 6-bit samples. Toggle ♪ for authentic recordings.',
    },
    ride: {
        e1: 'Bandpass-filtered noise with medium decay.',
        e2: 'Six square oscillators with tighter ratios (180–1080 Hz) for bell-like quality.',
        sample: 'Real 909 used 6-bit samples. Toggle ♪ for authentic recordings.',
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
    // Close on backdrop click
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) hideInfoModal();
    });
    // Close button
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

    let bodyHtml = `
        <div class="voice-info-section">
            <div class="voice-info-label">E1 — Simple</div>
            <div class="voice-info-text">${info.e1}</div>
        </div>
        <div class="voice-info-section">
            <div class="voice-info-label e2">E2 — Authentic</div>
            <div class="voice-info-text">${info.e2}</div>
        </div>
    `;

    if (info.sample) {
        bodyHtml += `<div class="voice-info-note">${info.sample}</div>`;
    }

    modal.querySelector('.voice-info-body').innerHTML = bodyHtml;
    modal.classList.add('active');
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideInfoModal();
});

const pattern = {};
const engine = new TR909Engine();
const PATTERN_ID = 'web-ui';
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
    kick: [],
    snare: [],
    clap: [],
    rimshot: [],
    ltom: [],
    mtom: [],
    htom: [],
    ch: [],
    oh: [],
    crash: [],
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
function handleVoiceLabelClick(voiceId) {
    const newState = engine.cycleVoiceState(voiceId);
    updateVoiceLabelState(voiceId, newState);
    // Update all labels when going to/from solo (affects other tracks visually)
    const hasSolo = VOICES.some(v => engine.getVoiceState(v.id) === 'solo');
    if (hasSolo || newState === 'normal') {
        VOICES.forEach(v => {
            const state = engine.getVoiceState(v.id);
            updateVoiceLabelState(v.id, state);
        });
    }
}
function updateVoiceLabelState(voiceId, state) {
    const labels = document.querySelectorAll(`.voice-label[data-voice-id="${voiceId}"], .voice-label-short[data-voice-id="${voiceId}"]`);
    const row = document.querySelector(`.voice-row[data-voice-id="${voiceId}"]`);
    labels.forEach(label => {
        label.classList.remove('muted', 'solo', 'dimmed');
        if (state === 'muted') {
            label.classList.add('muted');
        } else if (state === 'solo') {
            label.classList.add('solo');
        }
    });
    // Dim tracks that won't play (muted, or not solo when something is solo'd)
    if (row) {
        const shouldPlay = engine.shouldVoicePlay(voiceId);
        row.classList.toggle('voice-row--dimmed', !shouldPlay);
    }
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
function startKnobDrag(clientY, knobEl, voiceId, param, valueDisplay) {
    const min = param.range?.min ?? 0;
    const max = param.range?.max ?? 1;
    const step = param.range?.step ?? 0.01;
    const currentRotation = parseFloat(knobEl.style.getPropertyValue('--rotation') || '0');
    const currentValue = min + ((currentRotation + 135) / 270) * (max - min);
    activeKnob = {
        element: knobEl,
        startY: clientY,
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
function handleKnobMouseDown(e, knobEl, voiceId, param, valueDisplay) {
    e.preventDefault();
    startKnobDrag(e.clientY, knobEl, voiceId, param, valueDisplay);
}
function handleKnobTouchStart(e, knobEl, voiceId, param, valueDisplay) {
    e.preventDefault();
    if (e.touches.length > 0) {
        startKnobDrag(e.touches[0].clientY, knobEl, voiceId, param, valueDisplay);
    }
}
function updateKnobFromDrag(clientY) {
    if (!activeKnob)
        return;
    const deltaY = activeKnob.startY - clientY;
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
function handleKnobMouseMove(e) {
    updateKnobFromDrag(e.clientY);
}
function handleKnobTouchMove(e) {
    if (activeKnob && e.touches.length > 0) {
        e.preventDefault(); // Prevent scrolling while dragging knob
        updateKnobFromDrag(e.touches[0].clientY);
    }
}
function handleKnobEnd() {
    if (activeKnob) {
        activeKnob = null;
        document.body.style.cursor = '';
    }
}
// Set up global mouse/touch handlers for knob dragging
document.addEventListener('mousemove', handleKnobMouseMove);
document.addEventListener('mouseup', handleKnobEnd);
document.addEventListener('touchmove', handleKnobTouchMove, { passive: false });
document.addEventListener('touchend', handleKnobEnd);
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
            toggle.addEventListener('click', async (e) => {
                e.stopPropagation();
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
        // Add E1/E2 engine toggle for all voices
        if (engine.isEngineCapable(voice.id)) {
            const engineToggle = document.createElement('button');
            engineToggle.className = 'engine-toggle-mini';
            engineToggle.dataset.voiceId = voice.id;
            engineToggle.title = 'Toggle E1/E2 engine';
            const currentEngine = engine.getVoiceEngine(voice.id);
            engineToggle.textContent = currentEngine === 'E1' ? '1' : '2';
            engineToggle.classList.toggle('engine-e2', currentEngine === 'E2');
            engineToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const current = engine.getVoiceEngine(voice.id);
                const next = current === 'E1' ? 'E2' : 'E1';
                engine.setVoiceEngine(voice.id, next);
                engineToggle.textContent = next === 'E1' ? '1' : '2';
                engineToggle.classList.toggle('engine-e2', next === 'E2');
                // Preview the sound
                engine.trigger(voice.id, 0.8);
            });
            header.appendChild(engineToggle);
        }
        // Add info button
        const infoBtn = document.createElement('button');
        infoBtn.className = 'voice-info-btn';
        infoBtn.innerHTML = 'i';
        infoBtn.title = 'Synthesis info';
        infoBtn.setAttribute('aria-label', 'Show synthesis information');
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showVoiceInfo(voice.id, voice.label);
        });
        header.appendChild(infoBtn);
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
            knob.dataset.voiceId = voice.id;
            knob.dataset.paramId = param.id;
            const initialRotation = valueToRotation(param.defaultValue, param.range?.min ?? 0, param.range?.max ?? 1);
            knob.style.setProperty('--rotation', `${initialRotation}`);
            knob.style.transform = `rotate(${initialRotation}deg)`;
            const label = document.createElement('span');
            label.className = 'knob-label';
            label.textContent = param.label;
            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'knob-value';
            valueDisplay.textContent = formatParamValue(param.defaultValue, param);
            // Knob interaction - mouse and touch
            knob.addEventListener('mousedown', (e) => {
                handleKnobMouseDown(e, knob, voice.id, param, valueDisplay);
            });
            knob.addEventListener('touchstart', (e) => {
                handleKnobTouchStart(e, knob, voice.id, param, valueDisplay);
            }, { passive: false });
            // Double-click/tap to reset
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

    // Apply voice parameters if preset includes them
    if (preset.voiceParams) {
        const descriptors = engine.getVoiceParameterDescriptors();
        Object.entries(preset.voiceParams).forEach(([voiceId, params]) => {
            const voiceDescriptors = descriptors[voiceId] || [];
            Object.entries(params).forEach(([paramId, value]) => {
                try {
                    engine.setVoiceParameter(voiceId, paramId, value);
                    // Update UI knob if it exists
                    const knob = document.querySelector(`.knob[data-voice-id="${voiceId}"][data-param-id="${paramId}"]`);
                    if (knob) {
                        // Find the param descriptor for range info
                        const paramDesc = voiceDescriptors.find(p => p.id === paramId);
                        const min = paramDesc?.range?.min ?? 0;
                        const max = paramDesc?.range?.max ?? 1;
                        const rotation = valueToRotation(value, min, max);
                        knob.style.setProperty('--rotation', `${rotation}`);
                        knob.style.transform = `rotate(${rotation}deg)`;
                        // Update value display
                        const wrapper = knob.closest('.knob-wrapper');
                        const valueDisplay = wrapper?.querySelector('.knob-value');
                        if (valueDisplay && paramDesc) {
                            valueDisplay.textContent = formatParamValue(value, paramDesc);
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to set ${voiceId}.${paramId}:`, e);
                }
            });
        });
    }

    // Switch engine if preset specifies
    if (preset.engine) {
        try {
            engine.setEngine(preset.engine);
            // Update all engine toggle buttons
            document.querySelectorAll('.engine-toggle-mini').forEach(btn => {
                const voiceId = btn.dataset.voiceId;
                const currentEngine = engine.getVoiceEngine(voiceId);
                btn.textContent = currentEngine === 'E1' ? '1' : '2';
                btn.classList.toggle('engine-e2', currentEngine === 'E2');
            });
        } catch (e) {
            console.warn(`Failed to set engine to ${preset.engine}:`, e);
        }
    }
}

// Load just the kit (sound design: engine + voiceParams)
function loadKit(kit) {
    // First, reset all per-voice engines to defaults (clears any individual overrides)
    if (typeof engine.resetAllVoiceEngines === 'function') {
        engine.resetAllVoiceEngines();
    }

    // Apply engine if specified
    if (kit.engine) {
        try {
            // Force engine change even if same as current (to ensure clean state)
            engine.currentEngine = null; // Clear to force re-init
            engine.setEngine(kit.engine);
            // Update all engine toggle buttons
            document.querySelectorAll('.engine-toggle-mini').forEach(btn => {
                const voiceId = btn.dataset.voiceId;
                const currentEngine = engine.getVoiceEngine(voiceId);
                btn.textContent = currentEngine === 'E1' ? '1' : '2';
                btn.classList.toggle('engine-e2', currentEngine === 'E2');
            });
        } catch (e) {
            console.warn(`Failed to set engine to ${kit.engine}:`, e);
        }
    }

    // Reset ALL voice parameters to defaults
    const descriptors = engine.getVoiceParameterDescriptors();
    Object.entries(descriptors).forEach(([voiceId, params]) => {
        params.forEach((param) => {
            try {
                const defaultVal = param.defaultValue;
                engine.setVoiceParameter(voiceId, param.id, defaultVal);
                // Update UI knob
                const knob = document.querySelector(`.knob[data-voice-id="${voiceId}"][data-param-id="${param.id}"]`);
                if (knob) {
                    const min = param.range?.min ?? 0;
                    const max = param.range?.max ?? 1;
                    const rotation = valueToRotation(defaultVal, min, max);
                    knob.style.setProperty('--rotation', `${rotation}`);
                    knob.style.transform = `rotate(${rotation}deg)`;
                    const wrapper = knob.closest('.knob-wrapper');
                    const valueDisplay = wrapper?.querySelector('.knob-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = formatParamValue(defaultVal, param);
                    }
                }
            } catch (e) {
                // Ignore errors for params that don't exist on current engine
            }
        });
    });

    // Then apply kit-specific overrides
    if (kit.voiceParams) {
        Object.entries(kit.voiceParams).forEach(([voiceId, params]) => {
            const voiceDescriptors = descriptors[voiceId] || [];
            Object.entries(params).forEach(([paramId, value]) => {
                try {
                    engine.setVoiceParameter(voiceId, paramId, value);
                    // Update UI knob
                    const knob = document.querySelector(`.knob[data-voice-id="${voiceId}"][data-param-id="${paramId}"]`);
                    if (knob) {
                        const paramDesc = voiceDescriptors.find(p => p.id === paramId);
                        const min = paramDesc?.range?.min ?? 0;
                        const max = paramDesc?.range?.max ?? 1;
                        const rotation = valueToRotation(value, min, max);
                        knob.style.setProperty('--rotation', `${rotation}`);
                        knob.style.transform = `rotate(${rotation}deg)`;
                        const wrapper = knob.closest('.knob-wrapper');
                        const valueDisplay = wrapper?.querySelector('.knob-value');
                        if (valueDisplay && paramDesc) {
                            valueDisplay.textContent = formatParamValue(value, paramDesc);
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to set ${voiceId}.${paramId}:`, e);
                }
            });
        });
    }
}

// Load just the sequence (pattern + BPM)
function loadSequence(seq) {
    const bpmInput = document.getElementById('bpm');

    // Apply pattern
    VOICES.forEach((voice) => {
        const seqTrack = seq.pattern[voice.id];
        const track = ensureTrack(voice.id);
        if (seqTrack && Array.isArray(seqTrack)) {
            for (let i = 0; i < STEPS; i++) {
                const step = seqTrack[i];
                if (step) {
                    track[i] = { ...step };
                } else {
                    track[i] = { velocity: 0, accent: false };
                }
            }
        } else {
            for (let i = 0; i < STEPS; i++) {
                track[i] = { velocity: 0, accent: false };
            }
        }
    });
    commitPattern();
    refreshGrid();

    // Apply BPM
    if (bpmInput && seq.bpm) {
        bpmInput.value = String(seq.bpm);
        engine.setBpm(seq.bpm);
    }
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
    // Legacy - populate old preset dropdown if it exists
    const presetSelect = document.getElementById('preset');
    if (presetSelect) {
        TR909_PRESETS.forEach((preset) => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = `${preset.name} (${preset.bpm} BPM)`;
            presetSelect.appendChild(option);
        });
    }
}

// Unified kit dropdown: presets + saved kits + actions
async function populateKits() {
    const kitSelect = document.getElementById('kit-select');
    if (!kitSelect) return;

    // Clear existing options except first placeholder
    while (kitSelect.options.length > 1) {
        kitSelect.remove(1);
    }

    // Add presets group
    if (TR909_KITS.length > 0) {
        const presetsGroup = document.createElement('optgroup');
        presetsGroup.label = 'Presets';
        TR909_KITS.forEach((kit) => {
            const option = document.createElement('option');
            option.value = `preset:${kit.id}`;
            option.textContent = kit.name;
            presetsGroup.appendChild(option);
        });
        kitSelect.appendChild(presetsGroup);
    }

    // Add saved kits group
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

    // Add actions group
    const actionsGroup = document.createElement('optgroup');
    actionsGroup.label = '─────────';
    const saveOption = document.createElement('option');
    saveOption.value = 'action:save';
    saveOption.textContent = 'Save current as...';
    actionsGroup.appendChild(saveOption);

    // Only show Manage if there are saved kits
    if (saved.length > 0) {
        const manageOption = document.createElement('option');
        manageOption.value = 'action:manage';
        manageOption.textContent = 'Manage...';
        actionsGroup.appendChild(manageOption);
    }

    kitSelect.appendChild(actionsGroup);

    // Default to Punchy kit
    kitSelect.value = 'preset:punchy';
}

// Unified pattern dropdown: presets + saved patterns + actions
async function populatePatterns() {
    const patternSelect = document.getElementById('pattern-select');
    if (!patternSelect) return;

    // Clear existing options except first placeholder
    while (patternSelect.options.length > 1) {
        patternSelect.remove(1);
    }

    // Add presets group
    if (TR909_SEQUENCES.length > 0) {
        const presetsGroup = document.createElement('optgroup');
        presetsGroup.label = 'Presets';
        TR909_SEQUENCES.forEach((seq) => {
            const option = document.createElement('option');
            option.value = `preset:${seq.id}`;
            option.textContent = `${seq.name} (${seq.bpm})`;
            presetsGroup.appendChild(option);
        });
        patternSelect.appendChild(presetsGroup);
    }

    // Add saved patterns group
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

    // Add actions group
    const actionsGroup = document.createElement('optgroup');
    actionsGroup.label = '─────────';
    const saveOption = document.createElement('option');
    saveOption.value = 'action:save';
    saveOption.textContent = 'Save current as...';
    actionsGroup.appendChild(saveOption);

    // Only show Manage if there are saved patterns
    if (saved.length > 0) {
        const manageOption = document.createElement('option');
        manageOption.value = 'action:manage';
        manageOption.textContent = 'Manage...';
        actionsGroup.appendChild(manageOption);
    }

    patternSelect.appendChild(actionsGroup);

    // Default to Techno Basic pattern
    patternSelect.value = 'preset:techno-basic';
}
function setupControls() {
    const playToggleBtn = document.getElementById('play-toggle');
    const bpmInput = document.getElementById('bpm');
    const presetSelect = document.getElementById('preset');
    const kitSelect = document.getElementById('kit-select');
    const patternSelect = document.getElementById('pattern-select');
    const swingInput = document.getElementById('swing');
    const swingValue = document.getElementById('swing-value');
    const flamInput = document.getElementById('flam');
    const flamValue = document.getElementById('flam-value');

    // Track what was selected before (for action:save to restore)
    let previousPatternValue = '';

    // Populate dropdowns
    populatePresets();  // Legacy
    populateKits();
    populatePatterns();

    // Track previous kit selection (for action:save to restore)
    let previousKitValue = 'preset:punchy';

    // Kit selection - handles presets, saved kits, and actions
    kitSelect?.addEventListener('change', async () => {
        const value = kitSelect.value;
        if (!value) {
            previousKitValue = '';
            return;
        }

        const [type, id] = value.split(':');

        if (type === 'preset') {
            previousKitValue = value;
            const kit = TR909_KITS.find(k => k.id === id);
            if (kit) {
                loadKit(kit);
                setStatus(`Kit: ${kit.name} — ${kit.description}`);
            }
        } else if (type === 'saved') {
            previousKitValue = value;
            const saved = loadSavedKit(id);
            if (saved) {
                // Load saved kit - apply engine and voice params
                const kitToLoad = {
                    engine: saved.engine,
                    voiceParams: saved.voice_params,
                };
                loadKit(kitToLoad);
                setStatus(`Kit: ${id}`);
            }
        } else if (type === 'action' && id === 'save') {
            // Handle save action - restore previous selection first
            kitSelect.value = previousKitValue;

            const name = prompt('Enter kit name:');
            if (name && name.trim()) {
                try {
                    setStatus('Saving kit...');
                    await saveKit(name.trim());
                    await populateKits();
                    // Select the newly saved kit
                    kitSelect.value = `saved:${name.trim()}`;
                    previousKitValue = kitSelect.value;
                    setStatus(`Saved kit: ${name.trim()}`);
                } catch (e) {
                    setStatus(`Failed to save: ${e.message}`);
                }
            }
        } else if (type === 'action' && id === 'manage') {
            // Handle manage action - restore previous selection and show modal
            kitSelect.value = previousKitValue;
            showManageKitsModal();
        }
    });

    // Unified pattern selection - handles presets, saved patterns, and actions
    patternSelect?.addEventListener('change', async () => {
        const value = patternSelect.value;
        if (!value) {
            previousPatternValue = '';
            setStatus('Custom pattern mode');
            return;
        }

        const [type, id] = value.split(':');

        if (type === 'preset') {
            previousPatternValue = value;
            const seq = TR909_SEQUENCES.find(s => s.id === id);
            if (seq) {
                loadSequence(seq);
                setStatus(`Pattern: ${seq.name} at ${seq.bpm} BPM`);
            }
        } else if (type === 'saved') {
            previousPatternValue = value;
            const saved = loadSavedPattern(id);
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
                    } else {
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
                setStatus(`Loaded: ${id}`);
            }
        } else if (type === 'action' && id === 'save') {
            // Handle save action - restore previous selection first
            patternSelect.value = previousPatternValue;

            const name = prompt('Enter pattern name:');
            if (name && name.trim()) {
                const bpm = bpmInput ? Number(bpmInput.value) || 128 : 128;
                try {
                    setStatus('Saving pattern...');
                    await savePattern(name.trim(), bpm);
                    await populatePatterns();
                    // Select the newly saved pattern
                    patternSelect.value = `saved:${name.trim()}`;
                    previousPatternValue = patternSelect.value;
                    setStatus(`Saved: ${name.trim()}`);
                } catch (e) {
                    setStatus(`Failed to save: ${e.message}`);
                }
            }
        } else if (type === 'action' && id === 'manage') {
            // Handle manage action - restore previous selection and show modal
            patternSelect.value = previousPatternValue;
            showManageModal();
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
    // Flam control
    flamInput?.addEventListener('input', () => {
        const flam = Number(flamInput.value) / 100;
        engine.setFlam(flam);
        if (flamValue) {
            flamValue.textContent = `${flamInput.value}%`;
        }
    });
    // Global Accent control
    const accentInput = document.getElementById('accent');
    const accentValue = document.getElementById('accent-value');
    accentInput?.addEventListener('input', () => {
        const accent = Number(accentInput.value) / 100;
        engine.setGlobalAccent(accent);
        if (accentValue) {
            accentValue.textContent = `${accentInput.value}%`;
        }
    });
    // Pattern Length control
    const patternLengthSelect = document.getElementById('pattern-length');
    patternLengthSelect?.addEventListener('change', () => {
        const length = Number(patternLengthSelect.value);
        engine.setPatternLength(length);
        setStatus(`Pattern length: ${length} steps`);
    });
    // Scale Mode control
    const scaleModeSelect = document.getElementById('scale-mode');
    scaleModeSelect?.addEventListener('change', () => {
        const scale = scaleModeSelect.value;
        engine.setScale(scale);
        setStatus(`Scale: ${scale}`);
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
            if (presetSelect) presetSelect.value = '';
            if (patternSelect) patternSelect.value = '';
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
// Pattern storage via Supabase API
const PATTERNS_API = '/api/synth-patterns';
let cachedPatterns = null;

// Kit storage via Supabase API
const KITS_API = '/api/synth-kits';
let cachedKits = null;

async function fetchPatterns() {
    try {
        const res = await fetch(`${PATTERNS_API}?machine=909`);
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
    // Return cached patterns synchronously
    return cachedPatterns || [];
}

async function savePattern(name, bpm, existingPattern = null) {
    // Use existing pattern if provided (for rename), otherwise clone current pattern
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
            body: JSON.stringify({ name, machine: '909', bpm, pattern: patternCopy }),
        });

        if (res.status === 409) {
            throw new Error('A pattern with this name already exists');
        }
        if (!res.ok) throw new Error('Failed to save pattern');

        // Refresh cache
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
        const res = await fetch(`${PATTERNS_API}?name=${encodeURIComponent(name)}&machine=909`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete pattern');

        // Refresh cache
        await fetchPatterns();
        return true;
    } catch (e) {
        console.error('Failed to delete pattern:', e);
        throw e;
    }
}

// Kit API functions
async function fetchKits() {
    try {
        const res = await fetch(`${KITS_API}?machine=909`);
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
    // Capture current kit state from UI if not provided
    let kitData;
    if (existingKit) {
        kitData = existingKit;
    } else {
        // Get current engine type
        const currentEngine = engine.getVoiceEngine('kick'); // All voices use same engine

        // Get current voice parameters by reading from UI knobs
        const voiceParams = {};
        const descriptors = engine.getVoiceParameterDescriptors();
        VOICES.forEach((voice) => {
            const params = descriptors[voice.id];
            if (params) {
                voiceParams[voice.id] = {};
                params.forEach((param) => {
                    try {
                        // Read value from knob rotation
                        const knob = document.querySelector(`.knob[data-voice-id="${voice.id}"][data-param-id="${param.id}"]`);
                        if (knob) {
                            const rotation = parseFloat(knob.style.getPropertyValue('--rotation') || '0');
                            const min = param.range?.min ?? 0;
                            const max = param.range?.max ?? 1;
                            const value = min + ((rotation + 135) / 270) * (max - min);
                            // Only save if different from default
                            if (Math.abs(value - param.defaultValue) > 0.001) {
                                voiceParams[voice.id][param.id] = value;
                            }
                        }
                    } catch (e) {
                        // Ignore params that can't be read
                    }
                });
                // Remove empty objects
                if (Object.keys(voiceParams[voice.id]).length === 0) {
                    delete voiceParams[voice.id];
                }
            }
        });

        kitData = {
            engine: currentEngine,
            voiceParams,
        };
    }

    try {
        const res = await fetch(KITS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                machine: '909',
                engine: kitData.engine,
                voiceParams: kitData.voiceParams,
            }),
        });

        if (res.status === 409) {
            throw new Error('A kit with this name already exists');
        }
        if (!res.ok) throw new Error('Failed to save kit');

        // Refresh cache
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
        const res = await fetch(`${KITS_API}?name=${encodeURIComponent(name)}&machine=909`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete kit');

        // Refresh cache
        await fetchKits();
        return true;
    } catch (e) {
        console.error('Failed to delete kit:', e);
        throw e;
    }
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
// ========================================
// Pattern Export/Import (JSON)
// ========================================

const PATTERN_FORMAT_VERSION = 1;

function exportPatternJSON() {
    const bpmInput = document.getElementById('bpm');
    const swingInput = document.getElementById('swing');
    const flamInput = document.getElementById('flam');
    const accentInput = document.getElementById('accent');

    const exportData = {
        format: 'synthmachine-909',
        version: PATTERN_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        bpm: bpmInput ? Number(bpmInput.value) : 128,
        swing: swingInput ? Number(swingInput.value) : 0,
        flam: flamInput ? Number(flamInput.value) : 0,
        accent: accentInput ? Number(accentInput.value) : 100,
        pattern: {}
    };

    // Export pattern in simple format (easier to read/edit)
    VOICES.forEach((voice) => {
        const track = pattern[voice.id];
        if (track) {
            exportData.pattern[voice.id] = track.map(step => ({
                velocity: step.velocity,
                accent: step.accent || false
            }));
        }
    });

    // Download
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tr909-pattern-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus('Pattern exported to JSON');
}

function importPatternJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate format
            if (data.format !== 'synthmachine-909') {
                throw new Error('Invalid format: expected synthmachine-909');
            }

            // Load pattern
            if (data.pattern) {
                VOICES.forEach((voice) => {
                    const importedTrack = data.pattern[voice.id];
                    const track = ensureTrack(voice.id);
                    if (importedTrack && Array.isArray(importedTrack)) {
                        for (let i = 0; i < STEPS; i++) {
                            const step = importedTrack[i];
                            if (step) {
                                track[i] = {
                                    velocity: step.velocity ?? 0,
                                    accent: step.accent ?? false
                                };
                            } else {
                                track[i] = { velocity: 0, accent: false };
                            }
                        }
                    }
                });
                commitPattern();
                refreshGrid();
            }

            // Load settings
            const bpmInput = document.getElementById('bpm');
            const swingInput = document.getElementById('swing');
            const swingValue = document.getElementById('swing-value');
            const flamInput = document.getElementById('flam');
            const flamValue = document.getElementById('flam-value');
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
            if (data.flam !== undefined && flamInput) {
                flamInput.value = data.flam;
                engine.setFlam(data.flam / 100);
                if (flamValue) flamValue.textContent = `${data.flam}%`;
            }
            if (data.accent !== undefined && accentInput) {
                accentInput.value = data.accent;
                engine.setGlobalAccent(data.accent / 100);
                if (accentValue) accentValue.textContent = `${data.accent}%`;
            }

            // Clear preset selection
            const presetSelect = document.getElementById('preset');
            if (presetSelect) presetSelect.value = '';

            setStatus(`Pattern imported: ${file.name}`);
        } catch (err) {
            console.error('Import failed:', err);
            setStatus(`Import failed: ${err.message}`);
        }
    };
    reader.readAsText(file);
}

async function loadPatternFromURL(url) {
    try {
        setStatus('Loading pattern...');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Create a fake file object for the import function
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const file = new File([blob], 'remote-pattern.json', { type: 'application/json' });
        importPatternJSON(file);
    } catch (err) {
        console.error('Failed to load pattern from URL:', err);
        setStatus(`Failed to load pattern: ${err.message}`);
    }
}

function setupExportImport() {
    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const shareClose = shareModal?.querySelector('.share-modal-close');
    const exportWavBtn = document.getElementById('export-wav');
    const exportJsonBtn = document.getElementById('export-json');
    const importBtn = document.getElementById('import-json');
    const importFile = document.getElementById('import-file');

    // Open modal
    shareBtn?.addEventListener('click', () => {
        shareModal?.classList.add('active');
    });

    // Close modal
    shareClose?.addEventListener('click', () => {
        shareModal?.classList.remove('active');
    });

    // Close on backdrop click
    shareModal?.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.remove('active');
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shareModal?.classList.contains('active')) {
            shareModal.classList.remove('active');
        }
    });

    // Export WAV
    exportWavBtn?.addEventListener('click', async () => {
        const strongEl = exportWavBtn.querySelector('strong');
        const originalText = strongEl?.textContent || 'Export WAV';
        if (strongEl) strongEl.textContent = 'Rendering...';
        exportWavBtn.disabled = true;

        try {
            const bpmInput = document.getElementById('bpm');
            const bpm = bpmInput ? Number(bpmInput.value) || 128 : 128;
            const buffer = await engine.renderToBuffer({
                bars: 2,
                bpm: bpm
            });
            const wavData = audioBufferToWav(buffer);
            const blob = new Blob([wavData], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tr909-pattern-${Date.now()}.wav`;
            a.click();
            URL.revokeObjectURL(url);

            shareModal?.classList.remove('active');
        } catch (err) {
            console.error('WAV export failed:', err);
            alert('Export failed: ' + err.message);
        }

        if (strongEl) strongEl.textContent = originalText;
        exportWavBtn.disabled = false;
    });

    // Export JSON
    exportJsonBtn?.addEventListener('click', () => {
        exportPatternJSON();
        shareModal?.classList.remove('active');
    });

    importBtn?.addEventListener('click', () => {
        importFile?.click();
    });

    importFile?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            importPatternJSON(file);
            shareModal?.classList.remove('active');
            e.target.value = ''; // Reset for re-import
        }
    });
}

// ========================================
// Manage Patterns Modal
// ========================================

function showManageModal() {
    const modal = document.getElementById('manage-modal');
    const list = document.getElementById('manage-patterns-list');
    const emptyMsg = document.getElementById('manage-empty');
    if (!modal || !list) return;

    // Populate list with saved patterns
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
                    <button class="overwrite-btn" title="Overwrite with current">↻</button>
                    <button class="rename-btn" title="Rename">✎</button>
                    <button class="delete-btn" title="Delete">✕</button>
                </div>
            `;

            // Overwrite handler - saves current pattern to this name
            li.querySelector('.overwrite-btn').addEventListener('click', async () => {
                if (confirm(`Overwrite "${p.name}" with current pattern?`)) {
                    try {
                        const bpmInput = document.getElementById('bpm');
                        const bpm = bpmInput ? Number(bpmInput.value) || 128 : 128;
                        // Delete old, save new with same name
                        await deleteSavedPattern(p.name);
                        await savePattern(p.name, bpm);
                        await populatePatterns();
                        showManageModal(); // Refresh list
                        setStatus(`Updated "${p.name}"`);
                    } catch (e) {
                        setStatus(`Update failed: ${e.message}`);
                    }
                }
            });

            // Rename handler
            li.querySelector('.rename-btn').addEventListener('click', async () => {
                const newName = prompt(`Rename "${p.name}" to:`, p.name);
                if (newName && newName.trim() && newName.trim() !== p.name) {
                    try {
                        // Save with new name, then delete old
                        await savePattern(newName.trim(), p.bpm, p.pattern);
                        await deleteSavedPattern(p.name);
                        await populatePatterns();
                        showManageModal(); // Refresh list
                        setStatus(`Renamed to "${newName.trim()}"`);
                    } catch (e) {
                        setStatus(`Rename failed: ${e.message}`);
                    }
                }
            });

            // Delete handler
            li.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm(`Delete "${p.name}"?`)) {
                    try {
                        await deleteSavedPattern(p.name);
                        await populatePatterns();
                        showManageModal(); // Refresh list
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

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function setupManageModal() {
    const modal = document.getElementById('manage-modal');
    const closeBtn = modal?.querySelector('.manage-modal-close');

    closeBtn?.addEventListener('click', hideManageModal);

    // Close on backdrop click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) hideManageModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            hideManageModal();
        }
    });
}

// ========================================
// Manage Kits Modal
// ========================================

function showManageKitsModal() {
    const modal = document.getElementById('manage-kits-modal');
    const list = document.getElementById('manage-kits-list');
    const emptyMsg = document.getElementById('manage-kits-empty');
    if (!modal || !list) return;

    // Populate list with saved kits
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
                <span class="manage-pattern-bpm">${k.engine || 'E2'}</span>
                <div class="manage-pattern-actions">
                    <button class="overwrite-btn" title="Overwrite with current">↻</button>
                    <button class="rename-btn" title="Rename">✎</button>
                    <button class="delete-btn" title="Delete">✕</button>
                </div>
            `;

            // Overwrite handler - saves current kit settings to this name
            li.querySelector('.overwrite-btn').addEventListener('click', async () => {
                if (confirm(`Overwrite "${k.name}" with current kit settings?`)) {
                    try {
                        // Delete old, save new with same name
                        await deleteSavedKit(k.name);
                        await saveKit(k.name);
                        await populateKits();
                        showManageKitsModal(); // Refresh list
                        setStatus(`Updated kit "${k.name}"`);
                    } catch (e) {
                        setStatus(`Update failed: ${e.message}`);
                    }
                }
            });

            // Rename handler
            li.querySelector('.rename-btn').addEventListener('click', async () => {
                const newName = prompt(`Rename "${k.name}" to:`, k.name);
                if (newName && newName.trim() && newName.trim() !== k.name) {
                    try {
                        // Save with new name, then delete old
                        await saveKit(newName.trim(), { engine: k.engine, voiceParams: k.voice_params });
                        await deleteSavedKit(k.name);
                        await populateKits();
                        showManageKitsModal(); // Refresh list
                        setStatus(`Renamed to "${newName.trim()}"`);
                    } catch (e) {
                        setStatus(`Rename failed: ${e.message}`);
                    }
                }
            });

            // Delete handler
            li.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm(`Delete kit "${k.name}"?`)) {
                    try {
                        await deleteSavedKit(k.name);
                        await populateKits();
                        showManageKitsModal(); // Refresh list
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

    // Close on backdrop click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) hideManageKitsModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            hideManageKitsModal();
        }
    });
}

function checkURLParams() {
    const params = new URLSearchParams(window.location.search);

    // Load pattern from URL: ?load=<url-to-json>
    const loadUrl = params.get('load');
    if (loadUrl) {
        loadPatternFromURL(loadUrl);
        return;
    }

    // Load preset: ?preset=<preset-id>
    const presetId = params.get('preset');
    if (presetId) {
        const preset = TR909_PRESETS.find(p => p.id === presetId);
        if (preset) {
            loadPreset(preset);
            refreshGrid();
            const bpmInput = document.getElementById('bpm');
            if (bpmInput) {
                bpmInput.value = String(preset.bpm);
                engine.setBpm(preset.bpm);
            }
            setStatus(`Loaded preset: ${preset.name}`);
        }
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
    setupExportImport();
    setupManageModal();
    setupManageKitsModal();
    // Connect step change callback for visualization
    engine.onStepChange = updateStepIndicator;

    // Load default kit (Punchy) and pattern (Techno Basic) on startup
    const punchyKit = TR909_KITS.find(k => k.id === 'punchy');
    if (punchyKit) {
        loadKit(punchyKit);
    }
    const technoBasic = TR909_SEQUENCES.find(s => s.id === 'techno-basic');
    if (technoBasic) {
        loadSequence(technoBasic);
    }

    // Check URL params for ?load= or ?preset=
    checkURLParams();

    setStatus('Ready — tap steps to program, or press SPACE to play. Keys 1-0 trigger sounds.');
});
//# sourceMappingURL=app.js.map