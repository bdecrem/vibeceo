/**
 * JB202 Modular Bass Synth UI Application
 *
 * Uses custom DSP components for cross-platform consistent audio.
 */

import { JB202Engine } from '../../dist/machines/jb202/engine.js';
import { JB202Sequencer } from '../../dist/machines/jb202/sequencer.js';

const STEPS = 16;
const STORAGE_KEY = 'jb202-saved-patterns';

// Presets loaded from library (use JB200 presets for now)
let presets = [];
let sequences = [];

// Keyboard to note mapping
const KEY_TO_NOTE = {
    'a': 'C2', 'w': 'C#2', 's': 'D2', 'e': 'D#2',
    'd': 'E2', 'f': 'F2', 't': 'F#2', 'g': 'G2',
    'y': 'G#2', 'h': 'A2', 'u': 'A#2', 'j': 'B2',
    'k': 'C3',
};

// Default parameter values (0-1 normalized)
const DEFAULTS = {
    osc1Octave: 0,
    osc1Detune: 0.5,
    osc1Level: 0.63,
    osc2Octave: 0,
    osc2Detune: 0.57,
    osc2Level: 1.0,
    filterCutoff: 0.603,
    filterResonance: 0,
    filterEnvAmount: 0.6,
    filterAttack: 0,
    filterDecay: 0.4,
    filterSustain: 0.2,
    filterRelease: 0.3,
    ampAttack: 0,
    ampDecay: 0.3,
    ampSustain: 0,
    ampRelease: 0.2,
    drive: 0.2,
    level: 1.0,
};

// Initialize engine with Web Audio context
let engine = null;
let currentStep = -1;
let activeKnob = null;

// ========================================
// Audio Context & Engine Init
// ========================================

function initEngine() {
    if (engine) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();

    engine = new JB202Engine({
        context,
        sampleRate: context.sampleRate,
        bpm: 120
    });
}

// Resume audio context on user interaction
function resumeAudio() {
    if (engine?.context?.state === 'suspended') {
        engine.context.resume();
    }
}

// ========================================
// WAV Encoding (for export)
// ========================================

function audioBufferToWav(buffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const data = buffer.getChannelData(0);
    const dataLength = data.length * (bitDepth / 8);
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// ========================================
// Sequencer Grid
// ========================================

function renderSequencer() {
    const container = document.getElementById('seq-steps');
    if (!container || !engine) return;

    container.innerHTML = '';
    const pattern = engine.getPattern();

    for (let i = 0; i < STEPS; i++) {
        const step = pattern[i];
        const stepEl = document.createElement('div');
        stepEl.className = 'seq-step';
        stepEl.dataset.step = i.toString();

        const noteEl = document.createElement('button');
        noteEl.className = 'seq-note';
        noteEl.textContent = step.note;
        noteEl.dataset.step = i.toString();
        noteEl.addEventListener('click', () => cycleNote(i, 1));
        noteEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            cycleNote(i, -1);
        });

        let longPressTimer = null;
        noteEl.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                e.preventDefault();
                cycleNote(i, -1);
            }, 500);
        });
        noteEl.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        const gateEl = document.createElement('button');
        gateEl.className = 'seq-gate' + (step.gate ? ' active' : '');
        gateEl.dataset.step = i.toString();
        gateEl.addEventListener('click', () => toggleGate(i));

        const accentEl = document.createElement('button');
        accentEl.className = 'seq-accent' + (step.accent ? ' active' : '');
        accentEl.dataset.step = i.toString();
        accentEl.addEventListener('click', () => toggleAccent(i));

        const slideEl = document.createElement('button');
        slideEl.className = 'seq-slide' + (step.slide ? ' active' : '');
        slideEl.dataset.step = i.toString();
        slideEl.addEventListener('click', () => toggleSlide(i));

        stepEl.appendChild(noteEl);
        stepEl.appendChild(gateEl);
        stepEl.appendChild(accentEl);
        stepEl.appendChild(slideEl);

        container.appendChild(stepEl);
    }
}

function cycleNote(stepIndex, direction) {
    if (!engine) return;
    const step = engine.getStep(stepIndex);
    if (!step) return;

    const newNote = JB202Sequencer.cycleNote(step.note, direction);
    engine.setStep(stepIndex, { note: newNote });

    const noteEl = document.querySelector(`.seq-note[data-step="${stepIndex}"]`);
    if (noteEl) {
        noteEl.textContent = newNote;
    }

    if (step.gate) {
        resumeAudio();
        engine.playNote(newNote, step.accent);
    }
}

function toggleGate(stepIndex) {
    if (!engine) return;
    const step = engine.getStep(stepIndex);
    if (!step) return;

    const newGate = !step.gate;
    engine.setStep(stepIndex, { gate: newGate });

    const gateEl = document.querySelector(`.seq-gate[data-step="${stepIndex}"]`);
    if (gateEl) {
        gateEl.classList.toggle('active', newGate);
    }

    if (newGate) {
        resumeAudio();
        engine.playNote(step.note, step.accent);
    }
}

function toggleAccent(stepIndex) {
    if (!engine) return;
    const step = engine.getStep(stepIndex);
    if (!step) return;

    const newAccent = !step.accent;
    engine.setStep(stepIndex, { accent: newAccent });

    const accentEl = document.querySelector(`.seq-accent[data-step="${stepIndex}"]`);
    if (accentEl) {
        accentEl.classList.toggle('active', newAccent);
    }

    if (step.gate) {
        resumeAudio();
        engine.playNote(step.note, newAccent);
    }
}

function toggleSlide(stepIndex) {
    if (!engine) return;
    const step = engine.getStep(stepIndex);
    if (!step) return;

    const newSlide = !step.slide;
    engine.setStep(stepIndex, { slide: newSlide });

    const slideEl = document.querySelector(`.seq-slide[data-step="${stepIndex}"]`);
    if (slideEl) {
        slideEl.classList.toggle('active', newSlide);
    }
}

function refreshSequencer() {
    if (!engine) return;
    const pattern = engine.getPattern();

    for (let i = 0; i < STEPS; i++) {
        const step = pattern[i];

        const noteEl = document.querySelector(`.seq-note[data-step="${i}"]`);
        const gateEl = document.querySelector(`.seq-gate[data-step="${i}"]`);
        const accentEl = document.querySelector(`.seq-accent[data-step="${i}"]`);
        const slideEl = document.querySelector(`.seq-slide[data-step="${i}"]`);

        if (noteEl) noteEl.textContent = step.note;
        if (gateEl) gateEl.classList.toggle('active', step.gate);
        if (accentEl) accentEl.classList.toggle('active', step.accent);
        if (slideEl) slideEl.classList.toggle('active', step.slide);
    }
}

function updateStepIndicator(step) {
    currentStep = step;

    document.querySelectorAll('.seq-step.playing').forEach(el => {
        el.classList.remove('playing');
    });

    if (step >= 0 && step < STEPS) {
        const stepEl = document.querySelector(`.seq-step[data-step="${step}"]`);
        if (stepEl) {
            stepEl.classList.add('playing');
        }
    }

    updateStepPageIndicator(step);
}

// ========================================
// Knobs
// ========================================

function valueToRotation(value, min = 0, max = 1) {
    const normalized = (value - min) / (max - min);
    return -135 + normalized * 270;
}

function getKnobConfig(param) {
    if (param === 'osc1Octave' || param === 'osc2Octave') {
        return { min: -24, max: 24, isOctave: true };
    }
    return { min: 0, max: 1, isOctave: false };
}

function initKnobs() {
    const knobs = document.querySelectorAll('.knob');

    knobs.forEach(knob => {
        const param = knob.dataset.param;
        if (!param || !engine) return;

        const config = getKnobConfig(param);
        const value = engine.getParameter(param);
        const rotation = valueToRotation(value, config.min, config.max);
        knob.style.transform = `rotate(${rotation}deg)`;

        updateKnobDisplay(param, value);

        knob.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startKnobDrag(e.clientY, knob, param);
        });

        knob.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                startKnobDrag(e.touches[0].clientY, knob, param);
            }
        }, { passive: false });

        knob.addEventListener('dblclick', () => {
            resetKnob(knob, param);
        });
    });
}

function startKnobDrag(clientY, knobEl, paramId) {
    if (!engine) return;
    const currentValue = engine.getParameter(paramId);
    const config = getKnobConfig(paramId);

    activeKnob = {
        element: knobEl,
        startY: clientY,
        startValue: currentValue,
        paramId,
        config,
    };

    document.body.style.cursor = 'ns-resize';
}

function handleKnobMove(clientY) {
    if (!activeKnob || !engine) return;

    const deltaY = activeKnob.startY - clientY;
    const config = activeKnob.config;
    const range = config.max - config.min;
    const sensitivity = range / 150;

    let newValue = activeKnob.startValue + deltaY * sensitivity;
    newValue = Math.max(config.min, Math.min(config.max, newValue));

    if (config.isOctave) {
        newValue = Math.round(newValue);
    }

    engine.setParameter(activeKnob.paramId, newValue);

    const rotation = valueToRotation(newValue, config.min, config.max);
    activeKnob.element.style.transform = `rotate(${rotation}deg)`;

    updateKnobDisplay(activeKnob.paramId, newValue);
}

function handleKnobEnd() {
    if (activeKnob) {
        activeKnob = null;
        document.body.style.cursor = '';
    }
}

function updateKnobDisplay(paramId, value) {
    const valueEl = document.getElementById(`${paramId}-value`);
    if (!valueEl) return;

    const config = getKnobConfig(paramId);

    if (config.isOctave) {
        valueEl.textContent = value > 0 ? `+${value}` : value.toString();
    } else if (paramId === 'filterEnvAmount') {
        const bipolar = Math.round((value - 0.5) * 200);
        valueEl.textContent = bipolar > 0 ? `+${bipolar}` : bipolar.toString();
    } else {
        valueEl.textContent = Math.round(value * 100).toString();
    }
}

function resetKnob(knobEl, paramId) {
    if (!engine) return;
    const defaultValue = DEFAULTS[paramId] ?? 0.5;
    const config = getKnobConfig(paramId);

    engine.setParameter(paramId, defaultValue);

    const rotation = valueToRotation(defaultValue, config.min, config.max);
    knobEl.style.transform = `rotate(${rotation}deg)`;

    updateKnobDisplay(paramId, defaultValue);
}

function updateKnobsFromParams(parameters) {
    if (!engine) return;
    Object.entries(parameters).forEach(([paramId, value]) => {
        engine.setParameter(paramId, value);

        const config = getKnobConfig(paramId);
        const knob = document.querySelector(`.knob[data-param="${paramId}"]`);
        if (knob) {
            const rotation = valueToRotation(value, config.min, config.max);
            knob.style.transform = `rotate(${rotation}deg)`;
        }

        updateKnobDisplay(paramId, value);
    });
}

document.addEventListener('mousemove', (e) => handleKnobMove(e.clientY));
document.addEventListener('mouseup', handleKnobEnd);
document.addEventListener('touchmove', (e) => {
    if (activeKnob && e.touches.length > 0) {
        e.preventDefault();
        handleKnobMove(e.touches[0].clientY);
    }
}, { passive: false });
document.addEventListener('touchend', handleKnobEnd);

// ========================================
// Waveform Toggles
// ========================================

function setupWaveformToggles() {
    const osc1Btns = document.querySelectorAll('#osc1-saw, #osc1-square, #osc1-tri');
    osc1Btns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!engine) return;
            const waveform = btn.dataset.wave;
            engine.setOsc1Waveform(waveform);
            osc1Btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            resumeAudio();
            engine.playNote('C2', false);
        });
    });

    const osc2Btns = document.querySelectorAll('#osc2-saw, #osc2-square, #osc2-tri');
    osc2Btns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!engine) return;
            const waveform = btn.dataset.wave;
            engine.setOsc2Waveform(waveform);
            osc2Btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            resumeAudio();
            engine.playNote('C2', false);
        });
    });
}

function updateWaveformUI(osc1Wave, osc2Wave) {
    document.querySelectorAll('#osc1-saw, #osc1-square, #osc1-tri').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.wave === osc1Wave);
    });
    document.querySelectorAll('#osc2-saw, #osc2-square, #osc2-tri').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.wave === osc2Wave);
    });
}

// ========================================
// Presets (use JB200 presets for compatibility)
// ========================================

async function loadPresets() {
    try {
        // Try JB202 presets first, fall back to JB200
        let response = await fetch('../../dist/presets.json');
        if (!response.ok) {
            response = await fetch('/jb200/dist/presets.json');
        }
        if (!response.ok) throw new Error('Failed to load presets');
        const data = await response.json();
        presets = data.presets || [];
        populatePresetDropdown();
    } catch (err) {
        console.error('Failed to load presets:', err);
        const select = document.getElementById('preset-select');
        if (select) {
            select.innerHTML = '<option value="">Custom</option>';
        }
    }
}

function populatePresetDropdown() {
    const select = document.getElementById('preset-select');
    if (!select) return;

    select.innerHTML = '';
    presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        option.title = preset.description || '';
        select.appendChild(option);
    });

    if (presets.length > 0) {
        select.value = presets[0].id;
    }
}

function applyPreset(presetId) {
    if (!engine) return;
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    const params = preset.params;

    if (params.osc1Waveform) {
        engine.setOsc1Waveform(params.osc1Waveform);
    }
    if (params.osc2Waveform) {
        engine.setOsc2Waveform(params.osc2Waveform);
    }
    updateWaveformUI(
        params.osc1Waveform || 'sawtooth',
        params.osc2Waveform || 'sawtooth'
    );

    const numericParams = { ...params };
    delete numericParams.osc1Waveform;
    delete numericParams.osc2Waveform;

    updateKnobsFromParams(numericParams);

    setStatus(`Preset: ${preset.name}`);
}

function setupPresetDropdown() {
    const select = document.getElementById('preset-select');
    if (!select) return;

    select.addEventListener('change', (e) => {
        const presetId = e.target.value;
        if (presetId) {
            applyPreset(presetId);
        }
    });
}

// ========================================
// Sequences
// ========================================

async function loadSequences() {
    try {
        let response = await fetch('../../dist/sequences.json');
        if (!response.ok) {
            response = await fetch('/jb200/dist/sequences.json');
        }
        if (!response.ok) throw new Error('Failed to load sequences');
        const data = await response.json();
        sequences = data.sequences || [];
        populateSequenceDropdown();
    } catch (err) {
        console.error('Failed to load sequences:', err);
        const select = document.getElementById('sequence-select');
        if (select) {
            select.innerHTML = '<option value="">Custom</option>';
        }
    }
}

function populateSequenceDropdown() {
    const select = document.getElementById('sequence-select');
    if (!select) return;

    select.innerHTML = '';
    sequences.forEach(seq => {
        const option = document.createElement('option');
        option.value = seq.id;
        option.textContent = seq.name;
        option.title = seq.description || '';
        select.appendChild(option);
    });

    if (sequences.length > 0) {
        select.value = sequences[0].id;
    }
}

function applySequence(sequenceId) {
    if (!engine) return;
    const seq = sequences.find(s => s.id === sequenceId);
    if (!seq || !seq.pattern) return;

    engine.setPattern(seq.pattern);
    refreshSequencer();

    setStatus(`Sequence: ${seq.name}`);
}

function setupSequenceDropdown() {
    const select = document.getElementById('sequence-select');
    if (!select) return;

    select.addEventListener('change', (e) => {
        const sequenceId = e.target.value;
        if (sequenceId) {
            applySequence(sequenceId);
        }
    });
}

// ========================================
// Info Modal
// ========================================

function setupInfoModal() {
    const btn = document.getElementById('info-btn');
    const modal = document.getElementById('info-modal');
    const closeBtn = modal?.querySelector('.modal-close');

    btn?.addEventListener('click', () => {
        modal?.classList.add('active');
    });

    closeBtn?.addEventListener('click', () => {
        modal?.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal?.classList.remove('active');
        }
    });
}

// ========================================
// Transport Controls
// ========================================

function setupTransport() {
    const playBtn = document.getElementById('play-toggle');
    const bpmInput = document.getElementById('bpm');

    playBtn?.addEventListener('click', () => {
        if (!engine) return;
        resumeAudio();

        if (engine.isPlaying()) {
            engine.stopSequencer();
            playBtn.textContent = 'Play';
            setStatus('Stopped');
        } else {
            engine.startSequencer();
            playBtn.textContent = 'Stop';
            setStatus('Playing');
        }
    });

    bpmInput?.addEventListener('input', () => {
        if (!engine) return;
        const bpm = Number(bpmInput.value);
        if (!isNaN(bpm) && bpm >= 30 && bpm <= 300) {
            engine.setBpm(bpm);
        }
    });

    // WAV Export
    const wavExportBtn = document.getElementById('export-btn');
    const shareModal = document.getElementById('share-modal');

    wavExportBtn?.addEventListener('click', async () => {
        if (!engine) return;
        wavExportBtn.disabled = true;
        const iconEl = wavExportBtn.querySelector('.share-option-icon');
        const origIcon = iconEl?.textContent;
        if (iconEl) iconEl.textContent = '...';
        setStatus('Rendering audio...');

        try {
            const buffer = await engine.renderPattern({ bars: 1 });
            const blob = audioBufferToWav(buffer);
            downloadBlob(blob, `jb202-${Date.now()}.wav`);
            setStatus('WAV exported successfully');
            shareModal?.classList.remove('active');
        } catch (err) {
            console.error('Export failed:', err);
            setStatus('Export failed: ' + err.message);
        } finally {
            wavExportBtn.disabled = false;
            if (iconEl) iconEl.textContent = origIcon;
        }
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ========================================
// Keyboard Input
// ========================================

function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (!engine) return;
            resumeAudio();

            const playBtn = document.getElementById('play-toggle');
            if (engine.isPlaying()) {
                engine.stopSequencer();
                if (playBtn) playBtn.textContent = 'Play';
                setStatus('Stopped');
            } else {
                engine.startSequencer();
                if (playBtn) playBtn.textContent = 'Stop';
                setStatus('Playing');
            }
            return;
        }

        const note = KEY_TO_NOTE[e.key.toLowerCase()];
        if (note && engine) {
            e.preventDefault();
            resumeAudio();
            engine.playNote(note, e.shiftKey);
        }
    });
}

// ========================================
// Step Page Toggle (Mobile)
// ========================================

function setupStepPageToggle() {
    const buttons = document.querySelectorAll('.step-page-btn');
    const sequencer = document.getElementById('sequencer');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (page === '2') {
                sequencer?.classList.add('page-2');
            } else {
                sequencer?.classList.remove('page-2');
            }
        });
    });
}

function updateStepPageIndicator(step) {
    const buttons = document.querySelectorAll('.step-page-btn');
    buttons.forEach(btn => {
        const page = btn.dataset.page;
        const isPlaying = (page === '1' && step < 8) || (page === '2' && step >= 8);
        btn.classList.toggle('has-playing', isPlaying);
    });
}

// ========================================
// Status
// ========================================

function setStatus(message) {
    const el = document.getElementById('status');
    if (el) {
        el.textContent = message;
    }
}

// ========================================
// Pattern Export/Import
// ========================================

const PATTERN_FORMAT_VERSION = 1;

function exportKit() {
    if (!engine) return;
    const params = engine.getParameters();
    const kitData = {
        name: prompt('Kit name:', 'My Kit') || 'Untitled',
        description: '',
        author: 'User',
        params: {
            osc1Waveform: engine.getParameter('osc1Waveform') || 'sawtooth',
            osc1Octave: params.osc1Octave ?? 0,
            osc1Detune: Math.round((params.osc1Detune - 0.5) * 100),
            osc1Level: Math.round(params.osc1Level * 100),
            osc2Waveform: engine.getParameter('osc2Waveform') || 'sawtooth',
            osc2Octave: params.osc2Octave ?? 0,
            osc2Detune: Math.round((params.osc2Detune - 0.5) * 100),
            osc2Level: Math.round(params.osc2Level * 100),
            filterCutoff: Math.round(20 * Math.pow(800, params.filterCutoff)),
            filterResonance: Math.round(params.filterResonance * 100),
            filterEnvAmount: Math.round((params.filterEnvAmount - 0.5) * 200),
            filterAttack: Math.round(params.filterAttack * 100),
            filterDecay: Math.round(params.filterDecay * 100),
            filterSustain: Math.round(params.filterSustain * 100),
            filterRelease: Math.round(params.filterRelease * 100),
            ampAttack: Math.round(params.ampAttack * 100),
            ampDecay: Math.round(params.ampDecay * 100),
            ampSustain: Math.round(params.ampSustain * 100),
            ampRelease: Math.round(params.ampRelease * 100),
            drive: Math.round(params.drive * 100),
            level: 0
        }
    };

    const json = JSON.stringify(kitData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = kitData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus(`Kit exported: ${kitData.name}`);
}

function exportSequence() {
    if (!engine) return;
    const seqData = {
        name: prompt('Sequence name:', 'My Sequence') || 'Untitled',
        description: '',
        author: 'User',
        pattern: engine.getPattern()
    };

    const json = JSON.stringify(seqData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = seqData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus(`Sequence exported: ${seqData.name}`);
}

function exportPatternJSON() {
    if (!engine) return;
    const exportData = {
        format: 'synthmachine-jb202',
        version: PATTERN_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        bpm: engine.getBpm(),
        osc1Waveform: engine.getParameter('osc1Waveform'),
        osc2Waveform: engine.getParameter('osc2Waveform'),
        parameters: engine.getParameters(),
        pattern: engine.getPattern()
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jb202-pattern-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus('Pattern exported to JSON');
}

function importPatternJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Accept both jb200 and jb202 formats
            if (!data.format?.startsWith('synthmachine-jb')) {
                throw new Error('Invalid format');
            }

            if (data.pattern && engine) {
                engine.setPattern(data.pattern);
                refreshSequencer();
            }

            if (data.parameters) {
                updateKnobsFromParams(data.parameters);
            }

            if (data.osc1Waveform && engine) {
                engine.setOsc1Waveform(data.osc1Waveform);
            }
            if (data.osc2Waveform && engine) {
                engine.setOsc2Waveform(data.osc2Waveform);
            }
            updateWaveformUI(
                data.osc1Waveform || 'sawtooth',
                data.osc2Waveform || 'sawtooth'
            );

            if (data.bpm && engine) {
                engine.setBpm(data.bpm);
                const bpmInput = document.getElementById('bpm');
                if (bpmInput) bpmInput.value = data.bpm.toString();
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
    const exportKitBtn = document.getElementById('export-kit');
    const exportSeqBtn = document.getElementById('export-seq');
    const exportJsonBtn = document.getElementById('export-json');
    const importBtn = document.getElementById('import-json');
    const importFile = document.getElementById('import-file');

    shareBtn?.addEventListener('click', () => {
        shareModal?.classList.add('active');
    });

    shareClose?.addEventListener('click', () => {
        shareModal?.classList.remove('active');
    });

    shareModal?.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shareModal?.classList.contains('active')) {
            shareModal.classList.remove('active');
        }
    });

    exportKitBtn?.addEventListener('click', () => {
        exportKit();
        shareModal?.classList.remove('active');
    });

    exportSeqBtn?.addEventListener('click', () => {
        exportSequence();
        shareModal?.classList.remove('active');
    });

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
            e.target.value = '';
        }
    });
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize engine
    initEngine();

    // Setup UI
    renderSequencer();
    initKnobs();
    setupWaveformToggles();
    setupInfoModal();
    setupTransport();
    setupKeyboard();
    setupStepPageToggle();
    setupExportImport();
    setupPresetDropdown();
    setupSequenceDropdown();

    // Load presets and sequences
    await loadPresets();
    await loadSequences();

    // Connect step callback
    if (engine) {
        engine.sequencer.onStepChange = updateStepIndicator;
    }

    // Set default pattern
    const defaultPattern = [
        { note: 'C2', gate: true, accent: true, slide: false },
        { note: 'C2', gate: false, accent: false, slide: false },
        { note: 'C2', gate: true, accent: false, slide: false },
        { note: 'C2', gate: false, accent: false, slide: false },
        { note: 'D#2', gate: true, accent: false, slide: true },
        { note: 'D#2', gate: false, accent: false, slide: false },
        { note: 'G2', gate: true, accent: true, slide: false },
        { note: 'G2', gate: false, accent: false, slide: false },
        { note: 'C2', gate: true, accent: false, slide: false },
        { note: 'C2', gate: false, accent: false, slide: false },
        { note: 'A#1', gate: true, accent: false, slide: true },
        { note: 'A#1', gate: false, accent: false, slide: false },
        { note: 'G1', gate: true, accent: true, slide: false },
        { note: 'G1', gate: true, accent: false, slide: true },
        { note: 'A#1', gate: true, accent: false, slide: true },
        { note: 'C2', gate: true, accent: false, slide: true },
    ];

    if (engine) {
        engine.setPattern(defaultPattern);
    }
    refreshSequencer();

    // Check for test mode
    if (window.location.search.includes('test')) {
        runTestTone();
    } else {
        setStatus('Ready - Space to play, A-K for notes');
    }
});

// ========================================
// Test Tone
// ========================================

async function runTestTone() {
    if (!engine) return;
    setStatus('Test mode: rendering A440 saw...');

    try {
        const buffer = await engine.renderTestTone({ note: 'A4', duration: 1.0 });

        if (buffer) {
            const blob = audioBufferToWav(buffer);
            downloadBlob(blob, 'test-a440-saw-jb202.wav');
            setStatus('Test tone exported: test-a440-saw-jb202.wav');
        } else {
            setStatus('Test tone failed');
        }
    } catch (err) {
        console.error('Test tone failed:', err);
        setStatus('Test tone failed: ' + err.message);
    }
}
