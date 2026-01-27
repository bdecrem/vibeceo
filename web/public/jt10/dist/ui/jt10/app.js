/**
 * JT-10 UI Application
 *
 * Handles all UI interactions: knobs, sliders, keyboard, sequencer,
 * arpeggiator, transport controls, and export.
 */

import { JT10Engine } from '../../machines/jt10/engine.js';
import { JT10Sequencer } from '../../machines/jt10/sequencer.js';

const STEPS = 16;
const OCTAVE_START = 3; // C3

// Keyboard mapping
const KEY_MAP = {
    'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6,
    'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12
};

// Initialize engine
const engine = new JT10Engine();

// UI State
let currentOctave = OCTAVE_START;
let activeKnob = null;
let activeSlider = null;
let currentStep = -1;

// ========================================
// Knobs
// ========================================

function valueToRotation(value) {
    return -135 + value * 270;
}

function initKnobs() {
    const knobs = document.querySelectorAll('.knob');

    knobs.forEach(knob => {
        const param = knob.dataset.param;
        const defaultValue = parseFloat(knob.dataset.value) || 0.5;

        if (!param) return;

        engine.setParameter(param, defaultValue);
        const rotation = valueToRotation(defaultValue);
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
            const defaultVal = parseFloat(knob.dataset.value) || 0.5;
            engine.setParameter(param, defaultVal);
            knob.style.transform = `rotate(${valueToRotation(defaultVal)}deg)`;
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
    activeKnob.element.style.transform = `rotate(${valueToRotation(newValue)}deg)`;
}

function handleKnobEnd() {
    if (activeKnob) {
        activeKnob = null;
        document.body.style.cursor = '';
    }
}

// ========================================
// Sliders (ADSR)
// ========================================

function initSliders() {
    const sliders = document.querySelectorAll('.slider');

    sliders.forEach(slider => {
        const param = slider.dataset.param;
        const defaultValue = parseFloat(slider.dataset.value) || 0.5;

        if (!param) return;

        engine.setParameter(param, defaultValue);
        updateSliderPosition(slider, defaultValue);

        slider.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startSliderDrag(e.clientY, slider, param);
        });

        slider.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                startSliderDrag(e.touches[0].clientY, slider, param);
            }
        }, { passive: false });
    });
}

function updateSliderPosition(slider, value) {
    const handle = slider.querySelector('::before') || slider;
    slider.style.setProperty('--value', `${value * 100}%`);
}

function startSliderDrag(clientY, sliderEl, paramId) {
    const currentValue = engine.getParameter(paramId);
    const rect = sliderEl.getBoundingClientRect();

    activeSlider = {
        element: sliderEl,
        rect,
        paramId,
    };

    handleSliderUpdate(clientY);
    document.body.style.cursor = 'ns-resize';
}

function handleSliderUpdate(clientY) {
    if (!activeSlider) return;

    const { element, rect, paramId } = activeSlider;
    const relY = rect.bottom - clientY;
    let value = relY / rect.height;
    value = Math.max(0, Math.min(1, value));

    engine.setParameter(paramId, value);
    updateSliderPosition(element, value);
}

function handleSliderEnd() {
    if (activeSlider) {
        activeSlider = null;
        document.body.style.cursor = '';
    }
}

// Global mouse/touch handlers
document.addEventListener('mousemove', (e) => {
    handleKnobMove(e.clientY);
    if (activeSlider) handleSliderUpdate(e.clientY);
});
document.addEventListener('mouseup', () => {
    handleKnobEnd();
    handleSliderEnd();
});
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        if (activeKnob) {
            e.preventDefault();
            handleKnobMove(e.touches[0].clientY);
        }
        if (activeSlider) {
            e.preventDefault();
            handleSliderUpdate(e.touches[0].clientY);
        }
    }
}, { passive: false });
document.addEventListener('touchend', () => {
    handleKnobEnd();
    handleSliderEnd();
});

// ========================================
// Range/Mode Buttons
// ========================================

function setupRangeButtons() {
    const rangeButtons = document.querySelectorAll('.range-btn');
    rangeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            rangeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const range = parseInt(btn.dataset.range);
            engine.setParameter('range', range);
        });
    });

    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = parseInt(btn.dataset.mode);
            engine.setParameter('subMode', mode);
        });
    });
}

// ========================================
// LFO Waveform
// ========================================

function setupLfoWaveform() {
    const waveButtons = document.querySelectorAll('.lfo-waveform .wave-btn');
    waveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            waveButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            engine.setParameter('lfoWaveform', btn.dataset.wave);
        });
    });
}

// ========================================
// Arpeggiator
// ========================================

function setupArpeggiator() {
    const arpButtons = document.querySelectorAll('.arp-btn');
    arpButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            arpButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            engine.setArpMode(btn.dataset.mode);
        });
    });

    const octButtons = document.querySelectorAll('.oct-btn');
    octButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            octButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            engine.setArpOctaves(parseInt(btn.dataset.oct));
        });
    });
}

// ========================================
// Step Grid (Sequencer)
// ========================================

function renderStepGrid() {
    const container = document.getElementById('step-grid');
    if (!container) return;

    container.innerHTML = '';
    const pattern = engine.getPattern();

    for (let i = 0; i < STEPS; i++) {
        const step = pattern[i];
        const stepEl = document.createElement('button');
        stepEl.className = 'step' + (step.gate ? ' active' : '');
        stepEl.dataset.step = i.toString();
        stepEl.textContent = step.gate ? step.note : (i + 1).toString();
        stepEl.addEventListener('click', () => toggleStep(i));
        container.appendChild(stepEl);
    }
}

function toggleStep(index) {
    const step = engine.getStep(index);
    const newGate = !step.gate;
    engine.setStep(index, { gate: newGate });

    const stepEl = document.querySelector(`.step[data-step="${index}"]`);
    if (stepEl) {
        stepEl.classList.toggle('active', newGate);
        stepEl.textContent = newGate ? step.note : (index + 1).toString();
    }
}

function updateStepIndicator(step) {
    currentStep = step;

    document.querySelectorAll('.step.playing').forEach(el => {
        el.classList.remove('playing');
    });

    if (step >= 0 && step < STEPS) {
        const stepEl = document.querySelector(`.step[data-step="${step}"]`);
        if (stepEl) {
            stepEl.classList.add('playing');
        }
    }
}

// ========================================
// Keyboard
// ========================================

function renderKeyboard() {
    const container = document.getElementById('keyboard');
    if (!container) return;

    container.innerHTML = '';

    // Create 2 octaves of keys
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    for (let oct = 0; oct < 2; oct++) {
        for (let i = 0; i < 12; i++) {
            const note = notes[i];
            const isBlack = note.includes('#');
            const key = document.createElement('button');
            key.className = `key ${isBlack ? 'black' : 'white'}`;
            key.dataset.note = `${note}${currentOctave + oct}`;

            key.addEventListener('mousedown', () => {
                engine.playNote(key.dataset.note, false);
                key.classList.add('active');
            });
            key.addEventListener('mouseup', () => {
                engine.stopNote();
                key.classList.remove('active');
            });
            key.addEventListener('mouseleave', () => {
                key.classList.remove('active');
            });

            container.appendChild(key);
        }
    }
}

function setupKeyboardInput() {
    const activeKeys = new Set();

    document.addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.repeat) return;

        // Octave change
        if (e.key === 'z' && currentOctave > 1) {
            currentOctave--;
            renderKeyboard();
            return;
        }
        if (e.key === 'x' && currentOctave < 6) {
            currentOctave++;
            renderKeyboard();
            return;
        }

        // Space = play/stop
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayback();
            return;
        }

        // Note keys
        const noteOffset = KEY_MAP[e.key.toLowerCase()];
        if (noteOffset !== undefined && !activeKeys.has(e.key.toLowerCase())) {
            activeKeys.add(e.key.toLowerCase());
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C'];
            const octave = currentOctave + Math.floor(noteOffset / 12);
            const note = `${notes[noteOffset % 12]}${octave}`;
            engine.playNote(note, e.shiftKey);

            // Highlight key
            const keyEl = document.querySelector(`.key[data-note="${note}"]`);
            if (keyEl) keyEl.classList.add('active');
        }
    });

    document.addEventListener('keyup', (e) => {
        const noteOffset = KEY_MAP[e.key.toLowerCase()];
        if (noteOffset !== undefined) {
            activeKeys.delete(e.key.toLowerCase());
            if (activeKeys.size === 0) {
                engine.stopNote();
            }

            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C'];
            const octave = currentOctave + Math.floor(noteOffset / 12);
            const note = `${notes[noteOffset % 12]}${octave}`;
            const keyEl = document.querySelector(`.key[data-note="${note}"]`);
            if (keyEl) keyEl.classList.remove('active');
        }
    });
}

// ========================================
// Transport
// ========================================

function setupTransport() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const bpmInput = document.getElementById('bpm-input');

    playBtn?.addEventListener('click', () => {
        engine.startSequencer();
        playBtn.classList.add('active');
    });

    stopBtn?.addEventListener('click', () => {
        engine.stopSequencer();
        playBtn?.classList.remove('active');
    });

    bpmInput?.addEventListener('input', () => {
        const bpm = parseInt(bpmInput.value);
        if (!isNaN(bpm) && bpm >= 30 && bpm <= 300) {
            engine.setBpm(bpm);
        }
    });
}

function togglePlayback() {
    const playBtn = document.getElementById('play-btn');
    if (engine.isPlaying()) {
        engine.stopSequencer();
        playBtn?.classList.remove('active');
    } else {
        engine.startSequencer();
        playBtn?.classList.add('active');
    }
}

// ========================================
// Presets
// ========================================

async function setupPresets() {
    const dropdownBtn = document.getElementById('preset-dropdown-btn');
    const dropdownMenu = document.getElementById('preset-dropdown-menu');
    const dropdownText = dropdownBtn?.querySelector('.preset-dropdown-text');

    if (!dropdownBtn || !dropdownMenu) return;

    try {
        const response = await fetch('../../dist/presets.json');
        const presets = await response.json();

        Object.entries(presets).forEach(([id, preset]) => {
            const btn = document.createElement('button');
            btn.textContent = preset.name;
            btn.addEventListener('click', () => {
                loadPreset(id, preset);
                dropdownMenu.classList.remove('active');
                if (dropdownText) dropdownText.textContent = preset.name;
            });
            dropdownMenu.appendChild(btn);
        });
    } catch (err) {
        console.warn('Could not load presets:', err);
    }

    dropdownBtn.addEventListener('click', () => {
        dropdownMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });
}

function loadPreset(id, preset) {
    // Load parameters
    if (preset.parameters) {
        Object.entries(preset.parameters).forEach(([param, value]) => {
            engine.setParameter(param, value);

            // Update knob UI
            const knob = document.querySelector(`.knob[data-param="${param}"]`);
            if (knob) {
                knob.style.transform = `rotate(${valueToRotation(value)}deg)`;
            }
        });
    }

    // Load pattern
    if (preset.pattern) {
        engine.setPattern(preset.pattern);
        renderStepGrid();
    }

    // Load BPM
    if (preset.bpm) {
        engine.setBpm(preset.bpm);
        const bpmInput = document.getElementById('bpm-input');
        if (bpmInput) bpmInput.value = preset.bpm.toString();
    }
}

// ========================================
// Info Modal
// ========================================

function setupInfoModal() {
    const btn = document.getElementById('info-btn');
    const modal = document.getElementById('info-modal');
    const closeBtn = modal?.querySelector('.modal-close');

    btn?.addEventListener('click', () => {
        modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => {
        modal?.classList.add('hidden');
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal?.classList.add('hidden');
        }
    });
}

// ========================================
// Export/Import
// ========================================

function setupExportImport() {
    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const shareClose = shareModal?.querySelector('.share-modal-close');
    const exportWav = document.getElementById('export-btn');
    const exportJson = document.getElementById('export-json');
    const importJson = document.getElementById('import-json');
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

    exportWav?.addEventListener('click', async () => {
        exportWav.disabled = true;
        try {
            const buffer = await engine.renderPattern({ bars: 1 });
            const blob = await engine.audioBufferToBlob(buffer);
            downloadBlob(blob, `jt10-${Date.now()}.wav`);
            shareModal?.classList.remove('active');
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            exportWav.disabled = false;
        }
    });

    exportJson?.addEventListener('click', () => {
        const data = {
            format: 'jambot-jt10',
            version: 1,
            exportedAt: new Date().toISOString(),
            bpm: engine.getBpm(),
            parameters: engine.getParameters(),
            pattern: engine.getPattern()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `jt10-pattern-${Date.now()}.json`);
        shareModal?.classList.remove('active');
    });

    importJson?.addEventListener('click', () => {
        importFile?.click();
    });

    importFile?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.format !== 'jambot-jt10') {
                        throw new Error('Invalid format');
                    }
                    loadPreset('imported', data);
                    shareModal?.classList.remove('active');
                } catch (err) {
                    console.error('Import failed:', err);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
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
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    initKnobs();
    initSliders();
    setupRangeButtons();
    setupLfoWaveform();
    setupArpeggiator();
    renderStepGrid();
    renderKeyboard();
    setupKeyboardInput();
    setupTransport();
    await setupPresets();
    setupInfoModal();
    setupExportImport();

    engine.onStepChange = updateStepIndicator;
});
