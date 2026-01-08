/**
 * TB-303 UI Application
 *
 * Handles all UI interactions: sequencer grid, knobs, presets,
 * transport controls, keyboard input, and export.
 */

import { TB303Engine } from '../../machines/tb303/engine.js';
import { TB303_PRESETS, getPresetNames } from '../../machines/tb303/presets.js';
import { TB303Sequencer } from '../../machines/tb303/sequencer.js';

const STEPS = 16;
const STORAGE_KEY = 'tb303-saved-patterns';

// Keyboard to note mapping (QWERTY row = chromatic C2-B2)
const KEY_TO_NOTE = {
    'a': 'C2', 'w': 'C#2', 's': 'D2', 'e': 'D#2',
    'd': 'E2', 'f': 'F2', 't': 'F#2', 'g': 'G2',
    'y': 'G#2', 'h': 'A2', 'u': 'A#2', 'j': 'B2',
    'k': 'C3',
};

// Initialize engine
const engine = new TB303Engine();

// Current step for visualization
let currentStep = -1;

// Knob drag state
let activeKnob = null;

// ========================================
// Sequencer Grid
// ========================================

function renderSequencer() {
    const container = document.getElementById('seq-steps');
    if (!container) return;

    // Set CSS class for the grid container
    container.classList.add('seq-grid');

    container.innerHTML = '';
    const pattern = engine.getPattern();

    for (let i = 0; i < STEPS; i++) {
        const step = pattern[i];
        const stepEl = document.createElement('div');
        stepEl.className = 'seq-step';
        stepEl.dataset.step = i.toString();

        // Note display/control
        const noteEl = document.createElement('button');
        noteEl.className = 'seq-note';
        noteEl.textContent = step.note;
        noteEl.dataset.step = i.toString();
        noteEl.addEventListener('click', () => cycleNote(i, 1));
        noteEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            cycleNote(i, -1);
        });
        // Touch: long press to go down
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

        // Gate toggle
        const gateEl = document.createElement('button');
        gateEl.className = 'seq-gate' + (step.gate ? ' active' : '');
        gateEl.dataset.step = i.toString();
        gateEl.addEventListener('click', () => toggleGate(i));

        // Accent toggle
        const accentEl = document.createElement('button');
        accentEl.className = 'seq-accent' + (step.accent ? ' active' : '');
        accentEl.dataset.step = i.toString();
        accentEl.addEventListener('click', () => toggleAccent(i));

        // Slide toggle
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
    const step = engine.getStep(stepIndex);
    if (!step) return;

    const newNote = TB303Sequencer.cycleNote(step.note, direction);
    engine.setStep(stepIndex, { note: newNote });

    // Update UI
    const noteEl = document.querySelector(`.seq-note[data-step="${stepIndex}"]`);
    if (noteEl) {
        noteEl.textContent = newNote;
    }

    // Preview the note
    if (step.gate) {
        engine.playNote(newNote, step.accent);
    }
}

function toggleGate(stepIndex) {
    const step = engine.getStep(stepIndex);
    if (!step) return;

    const newGate = !step.gate;
    engine.setStep(stepIndex, { gate: newGate });

    const gateEl = document.querySelector(`.seq-gate[data-step="${stepIndex}"]`);
    if (gateEl) {
        gateEl.classList.toggle('active', newGate);
    }

    // Preview the note
    if (newGate) {
        engine.playNote(step.note, step.accent);
    }
}

function toggleAccent(stepIndex) {
    const step = engine.getStep(stepIndex);
    if (!step) return;

    const newAccent = !step.accent;
    engine.setStep(stepIndex, { accent: newAccent });

    const accentEl = document.querySelector(`.seq-accent[data-step="${stepIndex}"]`);
    if (accentEl) {
        accentEl.classList.toggle('active', newAccent);
    }

    // Preview
    if (step.gate) {
        engine.playNote(step.note, newAccent);
    }
}

function toggleSlide(stepIndex) {
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

    // Remove previous
    document.querySelectorAll('.seq-step.playing').forEach(el => {
        el.classList.remove('playing');
    });

    // Add current
    if (step >= 0 && step < STEPS) {
        const stepEl = document.querySelector(`.seq-step[data-step="${step}"]`);
        if (stepEl) {
            stepEl.classList.add('playing');
        }
    }

    // Update mobile page indicator
    updateStepPageIndicator(step);
}

// ========================================
// Knobs
// ========================================

function valueToRotation(value, min = 0, max = 1) {
    const normalized = (value - min) / (max - min);
    return -135 + normalized * 270;
}

function initKnobs() {
    const knobs = document.querySelectorAll('.knob');

    knobs.forEach(knob => {
        const param = knob.dataset.param;
        if (!param) return;

        const value = engine.getParameter(param);
        const rotation = valueToRotation(value);
        knob.style.transform = `rotate(${rotation}deg)`;

        // Mouse drag
        knob.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startKnobDrag(e.clientY, knob, param);
        });

        // Touch drag
        knob.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                startKnobDrag(e.touches[0].clientY, knob, param);
            }
        }, { passive: false });

        // Double-click reset
        knob.addEventListener('dblclick', () => {
            resetKnob(knob, param);
        });
    });
}

function startKnobDrag(clientY, knobEl, paramId) {
    const currentValue = engine.getParameter(paramId);

    activeKnob = {
        element: knobEl,
        startY: clientY,
        startValue: currentValue,
        paramId,
    };

    document.body.style.cursor = 'ns-resize';
}

function handleKnobMove(clientY) {
    if (!activeKnob) return;

    const deltaY = activeKnob.startY - clientY;
    const sensitivity = 1 / 150; // 150px = full range
    let newValue = activeKnob.startValue + deltaY * sensitivity;
    newValue = Math.max(0, Math.min(1, newValue));

    // Update engine
    engine.setParameter(activeKnob.paramId, newValue);

    // Update UI
    const rotation = valueToRotation(newValue);
    activeKnob.element.style.transform = `rotate(${rotation}deg)`;

    // Update value display
    const valueEl = document.getElementById(`${activeKnob.paramId}-value`);
    if (valueEl) {
        valueEl.textContent = Math.round(newValue * 100).toString();
    }
}

function handleKnobEnd() {
    if (activeKnob) {
        activeKnob = null;
        document.body.style.cursor = '';
    }
}

function resetKnob(knobEl, paramId) {
    const defaults = {
        cutoff: 0.5,
        resonance: 0.5,
        envMod: 0.5,
        decay: 0.5,
        accent: 0.8,
    };

    const defaultValue = defaults[paramId] ?? 0.5;
    engine.setParameter(paramId, defaultValue);

    const rotation = valueToRotation(defaultValue);
    knobEl.style.transform = `rotate(${rotation}deg)`;

    const valueEl = document.getElementById(`${paramId}-value`);
    if (valueEl) {
        valueEl.textContent = Math.round(defaultValue * 100).toString();
    }
}

function updateKnobsFromPreset(parameters) {
    Object.entries(parameters).forEach(([paramId, value]) => {
        engine.setParameter(paramId, value);

        const knob = document.querySelector(`.knob[data-param="${paramId}"]`);
        if (knob) {
            const rotation = valueToRotation(value);
            knob.style.transform = `rotate(${rotation}deg)`;
        }

        const valueEl = document.getElementById(`${paramId}-value`);
        if (valueEl) {
            valueEl.textContent = Math.round(value * 100).toString();
        }
    });
}

// Global mouse/touch handlers
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
// Waveform Toggle
// ========================================

function setupWaveformToggle() {
    const sawBtn = document.getElementById('wave-saw');
    const sqBtn = document.getElementById('wave-square');

    sawBtn?.addEventListener('click', () => {
        engine.setWaveform('sawtooth');
        sawBtn.classList.add('active');
        sqBtn?.classList.remove('active');
    });

    sqBtn?.addEventListener('click', () => {
        engine.setWaveform('square');
        sqBtn.classList.add('active');
        sawBtn?.classList.remove('active');
    });
}

function updateWaveformUI(waveform) {
    const sawBtn = document.getElementById('wave-saw');
    const sqBtn = document.getElementById('wave-square');

    if (waveform === 'sawtooth') {
        sawBtn?.classList.add('active');
        sqBtn?.classList.remove('active');
    } else {
        sqBtn?.classList.add('active');
        sawBtn?.classList.remove('active');
    }
}

// ========================================
// Engine Toggle (E1/E2)
// ========================================

function setupEngineToggle() {
    const btn = document.getElementById('engine-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const current = engine.getEngine();
        const next = current === 'E1' ? 'E2' : 'E1';
        engine.setEngine(next);

        btn.textContent = next === 'E1' ? '1' : '2';
        btn.classList.toggle('engine-e2', next === 'E2');

        // Preview sound with new engine
        engine.playNote('C2', false);

        setStatus(`Engine: ${next === 'E1' ? 'Simple' : 'Authentic'}`);
    });
}

// ========================================
// Info Modal
// ========================================

function setupInfoModal() {
    const btn = document.getElementById('info-btn');
    const modal = document.getElementById('info-modal');
    const closeBtn = modal?.querySelector('.voice-info-close');

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
// Presets
// ========================================

function populatePresets() {
    const select = document.getElementById('preset');
    if (!select) return;

    const presets = getPresetNames();
    presets.forEach(({ id, name }) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        select.appendChild(option);
    });
}

function loadPreset(presetId) {
    const preset = TB303_PRESETS[presetId];
    if (!preset) return;

    // Set pattern
    engine.setPattern(preset.pattern);
    refreshSequencer();

    // Set parameters
    updateKnobsFromPreset(preset.parameters);

    // Set waveform
    engine.setWaveform(preset.waveform);
    updateWaveformUI(preset.waveform);

    // Set BPM
    engine.setBpm(preset.bpm);
    const bpmInput = document.getElementById('bpm');
    if (bpmInput) {
        bpmInput.value = preset.bpm.toString();
    }

    setStatus(`Loaded: ${preset.name}`);
}

// ========================================
// Transport Controls
// ========================================

function setupTransport() {
    const playBtn = document.getElementById('play-toggle');
    const bpmInput = document.getElementById('bpm');
    const presetSelect = document.getElementById('preset');
    const exportBtn = document.getElementById('export-btn');

    playBtn?.addEventListener('click', () => {
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
        const bpm = Number(bpmInput.value);
        if (!isNaN(bpm) && bpm >= 30 && bpm <= 300) {
            engine.setBpm(bpm);
        }
    });

    presetSelect?.addEventListener('change', () => {
        const presetId = presetSelect.value;
        if (presetId) {
            loadPreset(presetId);
        }
    });

    // WAV Export
    exportBtn?.addEventListener('click', async () => {
        exportBtn.disabled = true;
        exportBtn.textContent = '...';
        setStatus('Rendering audio...');

        try {
            const buffer = await engine.renderPattern({ bars: 1 });
            const blob = engine.audioBufferToBlob(buffer);
            downloadBlob(blob, `tb303-${Date.now()}.wav`);
            setStatus('WAV exported successfully');
        } catch (err) {
            console.error('Export failed:', err);
            setStatus('Export failed: ' + err.message);
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = 'WAV';
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
        // Ignore if in input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
            return;
        }

        // Space = play/stop
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
                setStatus('Playing');
            }
            return;
        }

        // Note keys
        const note = KEY_TO_NOTE[e.key.toLowerCase()];
        if (note) {
            e.preventDefault();
            engine.playNote(note, e.shiftKey); // Shift = accent
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

            // Update button states
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle sequencer class
            if (page === '2') {
                sequencer?.classList.add('page-2');
            } else {
                sequencer?.classList.remove('page-2');
            }
        });
    });
}

function updateStepPageIndicator(step) {
    // Highlight which page contains the playing step
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
// Local Storage (Save/Load Patterns)
// ========================================

function getSavedPatterns() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveCurrentPattern(name) {
    const saved = getSavedPatterns();
    const patternData = {
        name,
        pattern: engine.getPattern(),
        parameters: engine.getParameters(),
        waveform: engine.getWaveform(),
        bpm: engine.getBpm(),
    };

    const existing = saved.findIndex(p => p.name === name);
    if (existing >= 0) {
        saved[existing] = patternData;
    } else {
        saved.push(patternData);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Load default preset
    loadPreset('acidLine1');

    // Setup UI
    renderSequencer();
    initKnobs();
    setupWaveformToggle();
    setupEngineToggle();
    setupInfoModal();
    populatePresets();
    setupTransport();
    setupKeyboard();
    setupStepPageToggle();

    // Connect step callback
    engine.onStepChange = updateStepIndicator;

    // Initial status
    setStatus('Ready — Space to play, A-K for notes');
});
