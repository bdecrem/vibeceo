/**
 * SH-101 Web UI Application
 */

import { SH101Controller } from '../../dist/api/index.js';
import { getPresetNames, getPreset } from '../../dist/machines/sh101/presets.js';

// Global state
let synth = null;
let currentOctave = 3;
let heldKeys = new Set();

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Create synth
    synth = new SH101Controller({ engine: 'E1' });

    // Initialize UI components
    initPresetSelector();
    initEngineToggle();
    initKnobs();
    initSliders();
    initRangeButtons();
    initSubModeButtons();
    initLfoWaveformButtons();
    initTransport();
    initArpControls();
    initStepGrid();
    initKeyboard();
    initModal();
    initExport();
    initExportImport();

    // Set up callbacks
    synth.onStepChange((step) => {
        updateStepHighlight(step);
    });

    // Check URL params or load default preset
    if (!checkURLParams()) {
        loadPreset('empty');
    }

    console.log('SH-101 initialized');
}

// --- Preset Selector (Custom Dropdown) ---

let currentPresetId = '';

function initPresetSelector() {
    const dropdown = document.getElementById('preset-dropdown');
    const btn = document.getElementById('preset-dropdown-btn');
    const menu = document.getElementById('preset-dropdown-menu');
    const presets = getPresetNames();

    // Populate menu
    presets.forEach(preset => {
        const item = document.createElement('div');
        item.className = 'preset-dropdown-item';
        item.dataset.value = preset.id;
        item.textContent = preset.name;
        item.addEventListener('click', () => {
            selectPreset(preset.id, preset.name);
            dropdown.classList.remove('open');
        });
        menu.appendChild(item);
    });

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.classList.remove('open');
        }
    });
}

function selectPreset(id, name) {
    currentPresetId = id;
    const textEl = document.querySelector('.preset-dropdown-text');
    if (textEl) {
        textEl.textContent = name || 'Select Preset...';
    }

    // Update selected state
    document.querySelectorAll('.preset-dropdown-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.value === id);
    });

    // Load the preset
    if (id) {
        loadPreset(id);
    }
}

function updatePresetSelector(id) {
    currentPresetId = id;
    const presets = getPresetNames();
    const preset = presets.find(p => p.id === id);
    const textEl = document.querySelector('.preset-dropdown-text');
    if (textEl) {
        textEl.textContent = preset?.name || 'Select Preset...';
    }
    document.querySelectorAll('.preset-dropdown-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.value === id);
    });
}

function loadPreset(id) {
    const preset = synth.loadPreset(id);
    if (!preset) return;

    // Update UI to match preset
    Object.entries(preset.parameters).forEach(([param, value]) => {
        updateKnobVisual(param, value);
        updateSliderVisual(param, value);
    });

    // Update sub mode buttons
    updateSubModeButtons(preset.parameters.subMode || 0);

    // Update LFO waveform
    updateLfoWaveformButtons(preset.parameters.lfoWaveform || 'triangle');

    // Update BPM
    if (preset.bpm) {
        document.getElementById('bpm-input').value = preset.bpm;
    }

    // Update pattern display
    if (preset.pattern) {
        updateStepGrid();
    }

    // Update preset selector (visual only, already loaded)
    updatePresetSelector(id);
}

// --- Engine Toggle ---

function initEngineToggle() {
    const e1Btn = document.getElementById('engine-e1');
    const e2Btn = document.getElementById('engine-e2');

    e1Btn.addEventListener('click', () => {
        synth.setEngine('E1');
        e1Btn.classList.add('active');
        e2Btn.classList.remove('active');
    });

    e2Btn.addEventListener('click', () => {
        synth.setEngine('E2');
        e2Btn.classList.add('active');
        e1Btn.classList.remove('active');
    });
}

// --- Knobs ---

function initKnobs() {
    document.querySelectorAll('.knob').forEach(knob => {
        const param = knob.dataset.param;
        const value = parseFloat(knob.dataset.value) || 0.5;

        updateKnobRotation(knob, value);

        let startY, startValue;

        const onPointerDown = (e) => {
            e.preventDefault();
            startY = e.clientY;
            startValue = parseFloat(knob.dataset.value) || 0.5;
            knob.setPointerCapture(e.pointerId);

            knob.addEventListener('pointermove', onPointerMove);
            knob.addEventListener('pointerup', onPointerUp);
        };

        const onPointerMove = (e) => {
            const delta = (startY - e.clientY) / 150;
            const newValue = Math.max(0, Math.min(1, startValue + delta));

            knob.dataset.value = newValue;
            updateKnobRotation(knob, newValue);
            synth.setParameter(param, newValue);
        };

        const onPointerUp = (e) => {
            knob.releasePointerCapture(e.pointerId);
            knob.removeEventListener('pointermove', onPointerMove);
            knob.removeEventListener('pointerup', onPointerUp);
        };

        knob.addEventListener('pointerdown', onPointerDown);

        // Double-click to reset
        knob.addEventListener('dblclick', () => {
            const defaultValue = 0.5;
            knob.dataset.value = defaultValue;
            updateKnobRotation(knob, defaultValue);
            synth.setParameter(param, defaultValue);
        });
    });
}

function updateKnobRotation(knob, value) {
    // Rotate from -135deg (min) to 135deg (max)
    const rotation = -135 + (value * 270);
    knob.style.setProperty('--rotation', `${rotation}deg`);
    if (knob.querySelector('::after') === null) {
        // Use transform on the knob itself for the indicator
        const indicator = knob.querySelector('.indicator') || knob;
    }
    // Apply rotation to the ::after pseudo-element via CSS variable
    knob.style.transform = `rotate(${rotation}deg)`;
}

function updateKnobVisual(param, value) {
    const knob = document.querySelector(`.knob[data-param="${param}"]`);
    if (knob) {
        knob.dataset.value = value;
        updateKnobRotation(knob, value);
    }
}

// --- Sliders ---

function initSliders() {
    document.querySelectorAll('.slider').forEach(slider => {
        const param = slider.dataset.param;
        const value = parseFloat(slider.dataset.value) || 0.5;

        updateSliderPosition(slider, value);

        let startY, startValue;

        const onPointerDown = (e) => {
            e.preventDefault();
            startY = e.clientY;
            startValue = parseFloat(slider.dataset.value) || 0.5;
            slider.setPointerCapture(e.pointerId);

            slider.addEventListener('pointermove', onPointerMove);
            slider.addEventListener('pointerup', onPointerUp);
        };

        const onPointerMove = (e) => {
            const delta = (startY - e.clientY) / 100;
            const newValue = Math.max(0, Math.min(1, startValue + delta));

            slider.dataset.value = newValue;
            updateSliderPosition(slider, newValue);
            synth.setParameter(param, newValue);
        };

        const onPointerUp = (e) => {
            slider.releasePointerCapture(e.pointerId);
            slider.removeEventListener('pointermove', onPointerMove);
            slider.removeEventListener('pointerup', onPointerUp);
        };

        slider.addEventListener('pointerdown', onPointerDown);
    });
}

function updateSliderPosition(slider, value) {
    // Position the handle (::after) based on value
    const handlePos = (1 - value) * 100;
    slider.style.setProperty('--handle-pos', `${handlePos}%`);
}

function updateSliderVisual(param, value) {
    const slider = document.querySelector(`.slider[data-param="${param}"]`);
    if (slider) {
        slider.dataset.value = value;
        updateSliderPosition(slider, value);
    }
}

// --- Range Buttons ---

function initRangeButtons() {
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Range affects octave - handled by oscillator
        });
    });
}

// --- Sub Mode Buttons ---

function initSubModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = parseInt(btn.dataset.mode);
            synth.setParameter('subMode', mode);
            updateSubModeButtons(mode);
        });
    });
}

function updateSubModeButtons(mode) {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.mode) === mode);
    });
}

// --- LFO Waveform Buttons ---

function initLfoWaveformButtons() {
    document.querySelectorAll('.wave-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const wave = btn.dataset.wave;
            synth.setParameter('lfoWaveform', wave);
            updateLfoWaveformButtons(wave);
        });
    });
}

function updateLfoWaveformButtons(wave) {
    document.querySelectorAll('.wave-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.wave === wave);
    });
}

// --- Transport ---

function initTransport() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const recBtn = document.getElementById('rec-btn');
    const bpmInput = document.getElementById('bpm-input');

    playBtn.addEventListener('click', () => {
        synth.play();
        playBtn.classList.add('active');
    });

    stopBtn.addEventListener('click', () => {
        synth.stop();
        playBtn.classList.remove('active');
        recBtn.classList.remove('active');
        clearStepHighlight();
    });

    recBtn.addEventListener('click', () => {
        recBtn.classList.toggle('active');
    });

    bpmInput.addEventListener('change', (e) => {
        const bpm = parseInt(e.target.value) || 120;
        synth.setBpm(bpm);
    });
}

// --- Arp Controls ---

function initArpControls() {
    // Arp mode buttons
    document.querySelectorAll('.arp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            synth.setArpMode(mode);
            document.querySelectorAll('.arp-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Hold button
    const holdBtn = document.getElementById('hold-btn');
    holdBtn.addEventListener('click', () => {
        holdBtn.classList.toggle('active');
        synth.setArpHold(holdBtn.classList.contains('active'));
    });

    // Octave buttons
    document.querySelectorAll('.oct-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const oct = parseInt(btn.dataset.oct);
            synth.setArpOctaves(oct);
            document.querySelectorAll('.oct-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// --- Step Grid ---

function initStepGrid() {
    const grid = document.querySelector('.step-grid');
    grid.innerHTML = '';

    for (let i = 0; i < 16; i++) {
        const step = document.createElement('div');
        step.className = 'step';
        step.dataset.step = i;

        step.innerHTML = `
            <div class="step-num">${i + 1}</div>
            <div class="step-note">---</div>
            <div class="step-indicators">
                <div class="step-dot gate"></div>
                <div class="step-dot accent"></div>
                <div class="step-dot slide"></div>
            </div>
        `;

        step.addEventListener('click', () => toggleStep(i));
        grid.appendChild(step);
    }

    updateStepGrid();
}

function updateStepGrid() {
    const pattern = synth.getPattern();

    pattern.forEach((stepData, i) => {
        const stepEl = document.querySelector(`.step[data-step="${i}"]`);
        if (!stepEl) return;

        const noteEl = stepEl.querySelector('.step-note');
        const gateEl = stepEl.querySelector('.step-dot.gate');
        const accentEl = stepEl.querySelector('.step-dot.accent');
        const slideEl = stepEl.querySelector('.step-dot.slide');

        noteEl.textContent = stepData.gate ? stepData.note : '---';
        stepEl.classList.toggle('has-note', stepData.gate);
        gateEl.classList.toggle('on', stepData.gate);
        accentEl.classList.toggle('on', stepData.accent);
        slideEl.classList.toggle('on', stepData.slide);
    });
}

function toggleStep(index) {
    const step = synth.getStep(index);
    step.gate = !step.gate;
    if (step.gate && step.note === 'C3') {
        // Default note
    }
    synth.setStep(index, step);
    updateStepGrid();
}

function updateStepHighlight(currentStep) {
    document.querySelectorAll('.step').forEach((el, i) => {
        el.classList.toggle('active', i === currentStep);
    });
}

function clearStepHighlight() {
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
    });
}

// --- Keyboard ---

function initKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';

    // Two octaves: C3 to B4
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];

    for (let octave = 3; octave <= 4; octave++) {
        notes.forEach((note, i) => {
            const isBlack = note.includes('#');
            const key = document.createElement('div');
            key.className = `key ${isBlack ? 'black' : 'white'}`;
            key.dataset.note = `${note}${octave}`;

            if (!isBlack) {
                const label = document.createElement('span');
                label.className = 'key-label';
                label.textContent = note + octave;
                key.appendChild(label);
            }

            // Mouse/touch events
            key.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                playKey(key);
            });

            key.addEventListener('pointerup', () => {
                releaseKey(key);
            });

            key.addEventListener('pointerleave', () => {
                releaseKey(key);
            });

            keyboard.appendChild(key);
        });
    }

    // Keyboard input
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function playKey(keyEl) {
    if (keyEl.classList.contains('pressed')) return;

    keyEl.classList.add('pressed');
    const note = keyEl.dataset.note;
    synth.playNote(note);
    synth.addArpNote(note);
}

function releaseKey(keyEl) {
    keyEl.classList.remove('pressed');
    const note = keyEl.dataset.note;
    synth.noteOff();
    synth.removeArpNote(note);
}

// Keyboard mapping
const keyboardMap = {
    'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
    'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
    'u': 'A#', 'j': 'B', 'k': 'C', 'o': 'C#', 'l': 'D',
    'p': 'D#', ';': 'E'
};

function handleKeyDown(e) {
    if (e.repeat) return;

    // Octave controls
    if (e.key === 'z') {
        currentOctave = Math.max(1, currentOctave - 1);
        return;
    }
    if (e.key === 'x') {
        currentOctave = Math.min(6, currentOctave + 1);
        return;
    }

    // Space for play/stop
    if (e.key === ' ') {
        e.preventDefault();
        if (synth.isPlaying()) {
            synth.stop();
            document.getElementById('play-btn').classList.remove('active');
        } else {
            synth.play();
            document.getElementById('play-btn').classList.add('active');
        }
        return;
    }

    const note = keyboardMap[e.key.toLowerCase()];
    if (!note) return;

    const octave = note === 'C' && ['k', 'l', ';'].includes(e.key.toLowerCase())
        ? currentOctave + 1
        : currentOctave;
    const fullNote = `${note}${octave}`;

    if (heldKeys.has(e.key)) return;
    heldKeys.add(e.key);

    // Find and highlight key
    const keyEl = document.querySelector(`.key[data-note="${fullNote}"]`);
    if (keyEl) {
        playKey(keyEl);
    } else {
        synth.playNote(fullNote);
    }
}

function handleKeyUp(e) {
    if (!heldKeys.has(e.key)) return;
    heldKeys.delete(e.key);

    const note = keyboardMap[e.key.toLowerCase()];
    if (!note) return;

    const octave = note === 'C' && ['k', 'l', ';'].includes(e.key.toLowerCase())
        ? currentOctave + 1
        : currentOctave;
    const fullNote = `${note}${octave}`;

    const keyEl = document.querySelector(`.key[data-note="${fullNote}"]`);
    if (keyEl) {
        releaseKey(keyEl);
    } else {
        synth.noteOff();
    }
}

// --- Modal ---

function initModal() {
    const modal = document.getElementById('info-modal');
    const infoBtn = document.getElementById('info-btn');
    const closeBtn = modal.querySelector('.modal-close');

    infoBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
        }
    });
}

// --- Export ---

function initExport() {
    const exportBtn = document.getElementById('export-btn');
    const shareModal = document.getElementById('share-modal');

    exportBtn?.addEventListener('click', async () => {
        const originalText = exportBtn.querySelector('strong')?.textContent || 'Export WAV';
        const strongEl = exportBtn.querySelector('strong');
        if (strongEl) strongEl.textContent = 'Rendering...';
        exportBtn.disabled = true;

        try {
            const { wav } = await synth.renderToWav({ bars: 2 });

            // Create download link
            const blob = new Blob([wav], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sh101-pattern.wav';
            a.click();
            URL.revokeObjectURL(url);

            // Close modal after export
            shareModal?.classList.remove('open');
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed: ' + err.message);
        }

        if (strongEl) strongEl.textContent = originalText;
        exportBtn.disabled = false;
    });
}

// --- Pattern Export/Import (JSON) ---

const PATTERN_FORMAT_VERSION = 1;

function exportPatternJSON() {
    const bpmInput = document.getElementById('bpm-input');

    const exportData = {
        format: 'synthmachine-101',
        version: PATTERN_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        bpm: bpmInput ? parseInt(bpmInput.value) : 120,
        pattern: synth.getPattern(),
        parameters: synth.getParameters ? synth.getParameters() : {},
        preset: currentPresetId || null
    };

    // Download
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sh101-pattern-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('Pattern exported to JSON');
}

function importPatternJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate format
            if (data.format !== 'synthmachine-101') {
                throw new Error('Invalid format: expected synthmachine-101');
            }

            // Load pattern
            if (data.pattern && Array.isArray(data.pattern)) {
                data.pattern.forEach((stepData, index) => {
                    synth.setStep(index, stepData);
                });
                updateStepGrid();
            }

            // Load parameters
            if (data.parameters) {
                Object.entries(data.parameters).forEach(([param, value]) => {
                    synth.setParameter(param, value);
                    updateKnobVisual(param, value);
                    updateSliderVisual(param, value);
                });

                // Update sub mode if present
                if (data.parameters.subMode !== undefined) {
                    updateSubModeButtons(data.parameters.subMode);
                }

                // Update LFO waveform if present
                if (data.parameters.lfoWaveform) {
                    updateLfoWaveformButtons(data.parameters.lfoWaveform);
                }
            }

            // Load BPM
            if (data.bpm) {
                synth.setBpm(data.bpm);
                const bpmInput = document.getElementById('bpm-input');
                if (bpmInput) bpmInput.value = data.bpm;
            }

            // Clear preset selection
            updatePresetSelector('');

            console.log(`Pattern imported: ${file.name}`);
        } catch (err) {
            console.error('Import failed:', err);
            alert('Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}

async function loadPatternFromURL(url) {
    try {
        console.log('Loading pattern...');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Create a fake file object for the import function
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const file = new File([blob], 'remote-pattern.json', { type: 'application/json' });
        importPatternJSON(file);
    } catch (err) {
        console.error('Failed to load pattern from URL:', err);
        alert('Failed to load pattern: ' + err.message);
    }
}

function initExportImport() {
    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const shareModalClose = shareModal?.querySelector('.share-modal-close');
    const exportJsonBtn = document.getElementById('export-json');
    const importBtn = document.getElementById('import-json');
    const importFile = document.getElementById('import-file');

    // Open modal
    shareBtn?.addEventListener('click', () => {
        shareModal?.classList.add('open');
    });

    // Close modal
    shareModalClose?.addEventListener('click', () => {
        shareModal?.classList.remove('open');
    });

    // Close on backdrop click
    shareModal?.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.remove('open');
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shareModal?.classList.contains('open')) {
            shareModal.classList.remove('open');
        }
    });

    // Export JSON
    exportJsonBtn?.addEventListener('click', () => {
        exportPatternJSON();
        shareModal?.classList.remove('open');
    });

    // Import JSON
    importBtn?.addEventListener('click', () => {
        importFile?.click();
    });

    importFile?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            importPatternJSON(file);
            shareModal?.classList.remove('open');
            e.target.value = ''; // Reset for re-import
        }
    });
}

function checkURLParams() {
    const params = new URLSearchParams(window.location.search);

    // Load pattern from URL: ?load=<url-to-json>
    const loadUrl = params.get('load');
    if (loadUrl) {
        loadPatternFromURL(loadUrl);
        return true;
    }

    // Load preset: ?preset=<preset-id>
    const presetId = params.get('preset');
    if (presetId) {
        loadPreset(presetId);
        return true;
    }

    return false;
}
