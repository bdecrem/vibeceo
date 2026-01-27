/**
 * JT-30 UI Application
 *
 * Handles all UI interactions: sequencer grid, knobs, presets,
 * transport controls, keyboard input, and export.
 */

import { JT30Engine } from '../../machines/jt30/engine.js';
import { JT30Sequencer } from '../../machines/jt30/sequencer.js';

const STEPS = 16;

// Keyboard to note mapping (QWERTY row = chromatic C2-B2)
const KEY_TO_NOTE = {
    'a': 'C2', 'w': 'C#2', 's': 'D2', 'e': 'D#2',
    'd': 'E2', 'f': 'F2', 't': 'F#2', 'g': 'G2',
    'y': 'G#2', 'h': 'A2', 'u': 'A#2', 'j': 'B2',
    'k': 'C3',
};

// Initialize engine
const engine = new JT30Engine();

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

    const newNote = JT30Sequencer.cycleNote(step.note, direction);
    engine.setStep(stepIndex, { note: newNote });

    const noteEl = document.querySelector(`.seq-note[data-step="${stepIndex}"]`);
    if (noteEl) {
        noteEl.textContent = newNote;
    }

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

function initKnobs() {
    const knobs = document.querySelectorAll('.knob');

    knobs.forEach(knob => {
        const param = knob.dataset.param;
        if (!param) return;

        const value = engine.getParameter(param);
        const rotation = valueToRotation(value);
        knob.style.transform = `rotate(${rotation}deg)`;

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
    const sensitivity = 1 / 150;
    let newValue = activeKnob.startValue + deltaY * sensitivity;
    newValue = Math.max(0, Math.min(1, newValue));

    engine.setParameter(activeKnob.paramId, newValue);

    const rotation = valueToRotation(newValue);
    activeKnob.element.style.transform = `rotate(${rotation}deg)`;

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

async function populatePresets() {
    const select = document.getElementById('preset');
    if (!select) return;

    try {
        const response = await fetch('../../dist/presets.json');
        const presets = await response.json();

        Object.entries(presets).forEach(([id, preset]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = preset.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.warn('Could not load presets:', err);
    }
}

async function loadPreset(presetId) {
    try {
        const response = await fetch('../../dist/presets.json');
        const presets = await response.json();
        const preset = presets[presetId];

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
    } catch (err) {
        console.error('Failed to load preset:', err);
    }
}

// ========================================
// Transport Controls
// ========================================

function setupTransport() {
    const playBtn = document.getElementById('play-toggle');
    const bpmInput = document.getElementById('bpm');
    const presetSelect = document.getElementById('preset');

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
    const wavExportBtn = document.getElementById('export-btn');
    const shareModal = document.getElementById('share-modal');

    wavExportBtn?.addEventListener('click', async () => {
        wavExportBtn.disabled = true;
        const iconEl = wavExportBtn.querySelector('.share-option-icon');
        const origIcon = iconEl?.textContent;
        if (iconEl) iconEl.textContent = '...';
        setStatus('Rendering audio...');

        try {
            const buffer = await engine.renderPattern({ bars: 1 });
            const blob = await engine.audioBufferToBlob(buffer);
            downloadBlob(blob, `jt30-${Date.now()}.wav`);
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
        if (note) {
            e.preventDefault();
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
// Pattern Export/Import (JSON)
// ========================================

function exportPatternJSON() {
    const exportData = {
        format: 'jambot-jt30',
        version: 1,
        exportedAt: new Date().toISOString(),
        bpm: engine.getBpm(),
        waveform: engine.getWaveform(),
        parameters: engine.getParameters(),
        pattern: engine.getPattern()
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `jt30-pattern-${Date.now()}.json`);

    setStatus('Pattern exported to JSON');
}

function importPatternJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (data.format !== 'jambot-jt30') {
                throw new Error('Invalid format: expected jambot-jt30');
            }

            if (data.pattern) {
                engine.setPattern(data.pattern);
                refreshSequencer();
            }

            if (data.parameters) {
                updateKnobsFromPreset(data.parameters);
            }

            if (data.waveform) {
                engine.setWaveform(data.waveform);
                updateWaveformUI(data.waveform);
            }

            if (data.bpm) {
                engine.setBpm(data.bpm);
                const bpmInput = document.getElementById('bpm');
                if (bpmInput) bpmInput.value = data.bpm.toString();
            }

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

function setupExportImport() {
    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const shareClose = shareModal?.querySelector('.share-modal-close');
    const exportBtn = document.getElementById('export-json');
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

    exportBtn?.addEventListener('click', () => {
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
    renderSequencer();
    initKnobs();
    setupWaveformToggle();
    setupInfoModal();
    await populatePresets();
    setupTransport();
    setupKeyboard();
    setupStepPageToggle();
    setupExportImport();

    engine.onStepChange = updateStepIndicator;

    setStatus('Ready - Space to play, A-K for notes');
});
