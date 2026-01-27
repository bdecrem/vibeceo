/**
 * JT-90 UI Application
 *
 * Handles all UI interactions: drum sequencer grid, voice parameters,
 * transport controls, keyboard input, and export.
 */

import { JT90Engine } from '../../machines/jt90/engine.js';
import { JT90Sequencer } from '../../machines/jt90/sequencer.js';

const STEPS = 16;

// Voice definitions with display names
const VOICES = [
    { id: 'kick', label: 'BD', name: 'Bass Drum' },
    { id: 'snare', label: 'SD', name: 'Snare' },
    { id: 'clap', label: 'CP', name: 'Clap' },
    { id: 'rimshot', label: 'RS', name: 'Rimshot' },
    { id: 'lowtom', label: 'LT', name: 'Low Tom' },
    { id: 'midtom', label: 'MT', name: 'Mid Tom' },
    { id: 'hitom', label: 'HT', name: 'High Tom' },
    { id: 'ch', label: 'CH', name: 'Closed Hat' },
    { id: 'oh', label: 'OH', name: 'Open Hat' },
    { id: 'crash', label: 'CC', name: 'Crash' },
    { id: 'ride', label: 'RC', name: 'Ride' },
];

// Keyboard mapping (number keys)
const KEY_MAP = {
    '1': 'kick', '2': 'snare', '3': 'clap', '4': 'rimshot',
    '5': 'lowtom', '6': 'midtom', '7': 'hitom',
    '8': 'ch', '9': 'oh', '0': 'crash',
};

// Initialize engine
const engine = new JT90Engine();

// UI State
let selectedVoice = 'kick';
let currentStep = -1;
let activeKnob = null;

// ========================================
// Sequencer Grid
// ========================================

function renderSequencer() {
    const container = document.getElementById('sequencer');
    if (!container) return;

    container.innerHTML = '';

    // Header row with step numbers
    const header = document.createElement('div');
    header.className = 'seq-header';
    header.innerHTML = '<span></span>';
    for (let i = 0; i < STEPS; i++) {
        header.innerHTML += `<span>${i + 1}</span>`;
    }
    container.appendChild(header);

    // Voice rows
    VOICES.forEach(voice => {
        const row = document.createElement('div');
        row.className = 'seq-row';
        row.dataset.voice = voice.id;

        // Label
        const label = document.createElement('div');
        label.className = 'seq-row-label' + (voice.id === selectedVoice ? ' selected' : '');
        label.textContent = voice.label;
        label.title = voice.name;
        label.addEventListener('click', () => selectVoice(voice.id));
        row.appendChild(label);

        // Steps
        const pattern = engine.getTrackPattern(voice.id);
        for (let i = 0; i < STEPS; i++) {
            const step = pattern[i];
            const stepEl = document.createElement('button');
            stepEl.className = 'seq-step';
            if (step.velocity > 0) {
                stepEl.classList.add('active');
                if (step.accent) stepEl.classList.add('accent');
            }
            stepEl.dataset.voice = voice.id;
            stepEl.dataset.step = i.toString();

            stepEl.addEventListener('click', (e) => {
                toggleStep(voice.id, i, e.shiftKey);
            });
            stepEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleAccent(voice.id, i);
            });

            row.appendChild(stepEl);
        }

        container.appendChild(row);
    });
}

function toggleStep(voiceId, stepIndex, withAccent = false) {
    const pattern = engine.getTrackPattern(voiceId);
    const step = pattern[stepIndex];

    if (step.velocity > 0) {
        // Turn off
        engine.setTrackStep(voiceId, stepIndex, { velocity: 0, accent: false });
    } else {
        // Turn on
        engine.setTrackStep(voiceId, stepIndex, { velocity: 1, accent: withAccent });
        // Preview sound
        engine.triggerVoice(voiceId, withAccent ? 1.2 : 1.0);
    }

    updateStepUI(voiceId, stepIndex);
}

function toggleAccent(voiceId, stepIndex) {
    const pattern = engine.getTrackPattern(voiceId);
    const step = pattern[stepIndex];

    if (step.velocity > 0) {
        const newAccent = !step.accent;
        engine.setTrackStep(voiceId, stepIndex, { accent: newAccent });
        updateStepUI(voiceId, stepIndex);

        // Preview with accent
        engine.triggerVoice(voiceId, newAccent ? 1.2 : 1.0);
    }
}

function updateStepUI(voiceId, stepIndex) {
    const stepEl = document.querySelector(`.seq-step[data-voice="${voiceId}"][data-step="${stepIndex}"]`);
    if (!stepEl) return;

    const pattern = engine.getTrackPattern(voiceId);
    const step = pattern[stepIndex];

    stepEl.classList.toggle('active', step.velocity > 0);
    stepEl.classList.toggle('accent', step.accent);
}

function updateStepIndicator(step) {
    currentStep = step;

    // Remove previous playing indicators
    document.querySelectorAll('.seq-step.playing').forEach(el => {
        el.classList.remove('playing');
    });

    // Add current
    if (step >= 0 && step < STEPS) {
        document.querySelectorAll(`.seq-step[data-step="${step}"]`).forEach(el => {
            el.classList.add('playing');
        });
    }

    // Update mobile page indicator
    updateStepPageIndicator(step);
}

// ========================================
// Voice Selection & Parameters
// ========================================

function selectVoice(voiceId) {
    selectedVoice = voiceId;

    // Update UI
    document.querySelectorAll('.seq-row-label').forEach(el => {
        el.classList.toggle('selected', el.closest('.seq-row')?.dataset.voice === voiceId);
    });

    // Show voice parameters
    renderVoiceParams(voiceId);
}

function renderVoiceParams(voiceId) {
    const container = document.getElementById('voice-params');
    if (!container) return;

    const params = engine.getVoiceParams(voiceId);
    if (!params || params.length === 0) {
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.75rem;">No parameters for this voice</span>';
        return;
    }

    container.innerHTML = '';

    params.forEach(param => {
        const wrapper = document.createElement('div');
        wrapper.className = 'param-knob';

        const knob = document.createElement('div');
        knob.className = 'knob';
        knob.dataset.voice = voiceId;
        knob.dataset.param = param.id;

        const value = engine.getVoiceParameter(voiceId, param.id);
        const rotation = valueToRotation(value, param.min, param.max);
        knob.style.transform = `rotate(${rotation}deg)`;

        knob.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startKnobDrag(e.clientY, knob, voiceId, param);
        });

        knob.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                startKnobDrag(e.touches[0].clientY, knob, voiceId, param);
            }
        }, { passive: false });

        const label = document.createElement('label');
        label.textContent = param.label;

        const valueEl = document.createElement('span');
        valueEl.className = 'value';
        valueEl.id = `param-${voiceId}-${param.id}`;
        valueEl.textContent = formatParamValue(value, param);

        wrapper.appendChild(knob);
        wrapper.appendChild(label);
        wrapper.appendChild(valueEl);
        container.appendChild(wrapper);
    });
}

function valueToRotation(value, min = 0, max = 1) {
    const normalized = (value - min) / (max - min);
    return -135 + normalized * 270;
}

function formatParamValue(value, param) {
    if (param.unit === 'cents') {
        return `${value > 0 ? '+' : ''}${Math.round(value)}`;
    }
    if (param.unit === 's' || param.unit === 'ms') {
        return value.toFixed(2);
    }
    return Math.round(value * 100).toString();
}

function startKnobDrag(clientY, knobEl, voiceId, param) {
    const currentValue = engine.getVoiceParameter(voiceId, param.id);

    activeKnob = {
        element: knobEl,
        startY: clientY,
        startValue: currentValue,
        voiceId,
        param,
    };

    document.body.style.cursor = 'ns-resize';
}

function handleKnobMove(clientY) {
    if (!activeKnob) return;

    const { element, startY, startValue, voiceId, param } = activeKnob;
    const deltaY = startY - clientY;
    const range = param.max - param.min;
    const sensitivity = range / 150;

    let newValue = startValue + deltaY * sensitivity;
    newValue = Math.max(param.min, Math.min(param.max, newValue));

    engine.setVoiceParameter(voiceId, param.id, newValue);

    const rotation = valueToRotation(newValue, param.min, param.max);
    element.style.transform = `rotate(${rotation}deg)`;

    const valueEl = document.getElementById(`param-${voiceId}-${param.id}`);
    if (valueEl) {
        valueEl.textContent = formatParamValue(newValue, param);
    }
}

function handleKnobEnd() {
    if (activeKnob) {
        activeKnob = null;
        document.body.style.cursor = '';
    }
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
// Transport & Controls
// ========================================

function setupTransport() {
    const playBtn = document.getElementById('play-toggle');
    const bpmInput = document.getElementById('bpm');
    const swingInput = document.getElementById('swing');
    const swingValue = document.getElementById('swing-value');
    const accentInput = document.getElementById('accent');
    const accentValue = document.getElementById('accent-value');
    const volumeInput = document.getElementById('volume');
    const volumeValue = document.getElementById('volume-value');
    const lengthSelect = document.getElementById('pattern-length');

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

    swingInput?.addEventListener('input', () => {
        const swing = Number(swingInput.value) / 100;
        engine.setSwing(swing);
        if (swingValue) swingValue.textContent = `${swingInput.value}%`;
    });

    accentInput?.addEventListener('input', () => {
        const accent = Number(accentInput.value) / 100;
        engine.setAccentLevel(accent);
        if (accentValue) accentValue.textContent = `${accentInput.value}%`;
    });

    volumeInput?.addEventListener('input', () => {
        const volume = Number(volumeInput.value) / 100;
        engine.setVolume(volume);
        if (volumeValue) volumeValue.textContent = `${volumeInput.value}%`;
    });

    lengthSelect?.addEventListener('change', () => {
        const length = Number(lengthSelect.value);
        engine.setPatternLength(length);
    });
}

// ========================================
// Presets & Patterns
// ========================================

async function setupPresets() {
    const kitSelect = document.getElementById('kit-select');
    const patternSelect = document.getElementById('pattern-select');

    // Load kits (presets)
    try {
        const response = await fetch('../../dist/presets.json');
        const presets = await response.json();

        Object.entries(presets).forEach(([id, preset]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = preset.name;
            kitSelect?.appendChild(option);
        });
    } catch (err) {
        console.warn('Could not load presets:', err);
    }

    // Load patterns (sequences)
    try {
        const response = await fetch('../../dist/sequences.json');
        const sequences = await response.json();

        Object.entries(sequences).forEach(([id, seq]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = seq.name;
            patternSelect?.appendChild(option);
        });
    } catch (err) {
        console.warn('Could not load sequences:', err);
    }

    kitSelect?.addEventListener('change', async () => {
        const kitId = kitSelect.value;
        if (kitId) {
            await loadKit(kitId);
        }
    });

    patternSelect?.addEventListener('change', async () => {
        const patternId = patternSelect.value;
        if (patternId) {
            await loadPattern(patternId);
        }
    });
}

async function loadKit(kitId) {
    try {
        const response = await fetch('../../dist/presets.json');
        const presets = await response.json();
        const kit = presets[kitId];

        if (kit?.voiceParams) {
            Object.entries(kit.voiceParams).forEach(([voiceId, params]) => {
                Object.entries(params).forEach(([paramId, value]) => {
                    engine.setVoiceParameter(voiceId, paramId, value);
                });
            });
        }

        // Refresh voice params display
        renderVoiceParams(selectedVoice);
        setStatus(`Loaded kit: ${kit.name}`);
    } catch (err) {
        console.error('Failed to load kit:', err);
    }
}

async function loadPattern(patternId) {
    try {
        const response = await fetch('../../dist/sequences.json');
        const sequences = await response.json();
        const seq = sequences[patternId];

        if (seq?.pattern) {
            Object.entries(seq.pattern).forEach(([voiceId, steps]) => {
                steps.forEach((step, i) => {
                    engine.setTrackStep(voiceId, i, step);
                });
            });
        }

        renderSequencer();
        setStatus(`Loaded pattern: ${seq.name}`);
    } catch (err) {
        console.error('Failed to load pattern:', err);
    }
}

// ========================================
// Keyboard Input
// ========================================

function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
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

        // Number keys trigger voices
        const voiceId = KEY_MAP[e.key];
        if (voiceId) {
            e.preventDefault();
            engine.triggerVoice(voiceId, e.shiftKey ? 1.2 : 1.0);
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
// Export/Import
// ========================================

function setupExportImport() {
    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const shareClose = shareModal?.querySelector('.share-modal-close');
    const exportWav = document.getElementById('export-wav');
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shareModal?.classList.contains('active')) {
            shareModal.classList.remove('active');
        }
    });

    exportWav?.addEventListener('click', async () => {
        exportWav.disabled = true;
        const iconEl = exportWav.querySelector('.share-option-icon');
        const origIcon = iconEl?.textContent;
        if (iconEl) iconEl.textContent = '...';
        setStatus('Rendering audio...');

        try {
            const buffer = await engine.renderPattern({ bars: 1 });
            const blob = await engine.audioBufferToBlob(buffer);
            downloadBlob(blob, `jt90-${Date.now()}.wav`);
            setStatus('WAV exported successfully');
            shareModal?.classList.remove('active');
        } catch (err) {
            console.error('Export failed:', err);
            setStatus('Export failed: ' + err.message);
        } finally {
            exportWav.disabled = false;
            if (iconEl) iconEl.textContent = origIcon;
        }
    });

    exportJson?.addEventListener('click', () => {
        const data = {
            format: 'jambot-jt90',
            version: 1,
            exportedAt: new Date().toISOString(),
            bpm: engine.getBpm(),
            swing: engine.getSwing(),
            pattern: engine.getFullPattern(),
            voiceParams: engine.getAllVoiceParams()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `jt90-pattern-${Date.now()}.json`);
        setStatus('Pattern exported to JSON');
        shareModal?.classList.remove('active');
    });

    importJson?.addEventListener('click', () => {
        importFile?.click();
    });

    importFile?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);

                    if (data.format !== 'jambot-jt90') {
                        throw new Error('Invalid format: expected jambot-jt90');
                    }

                    // Load pattern
                    if (data.pattern) {
                        Object.entries(data.pattern).forEach(([voiceId, steps]) => {
                            steps.forEach((step, i) => {
                                engine.setTrackStep(voiceId, i, step);
                            });
                        });
                    }

                    // Load voice params
                    if (data.voiceParams) {
                        Object.entries(data.voiceParams).forEach(([voiceId, params]) => {
                            Object.entries(params).forEach(([paramId, value]) => {
                                engine.setVoiceParameter(voiceId, paramId, value);
                            });
                        });
                    }

                    // Load BPM
                    if (data.bpm) {
                        engine.setBpm(data.bpm);
                        const bpmInput = document.getElementById('bpm');
                        if (bpmInput) bpmInput.value = data.bpm.toString();
                    }

                    // Load swing
                    if (data.swing !== undefined) {
                        engine.setSwing(data.swing);
                        const swingInput = document.getElementById('swing');
                        const swingValue = document.getElementById('swing-value');
                        if (swingInput) swingInput.value = Math.round(data.swing * 100).toString();
                        if (swingValue) swingValue.textContent = `${Math.round(data.swing * 100)}%`;
                    }

                    renderSequencer();
                    renderVoiceParams(selectedVoice);
                    setStatus(`Pattern imported: ${file.name}`);
                    shareModal?.classList.remove('active');
                } catch (err) {
                    console.error('Import failed:', err);
                    setStatus(`Import failed: ${err.message}`);
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
// Status
// ========================================

function setStatus(message) {
    const el = document.getElementById('status');
    if (el) {
        el.textContent = message;
    }
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    renderSequencer();
    selectVoice('kick');
    setupTransport();
    await setupPresets();
    setupKeyboard();
    setupStepPageToggle();
    setupInfoModal();
    setupExportImport();

    engine.onStepChange = updateStepIndicator;

    setStatus('Ready - Space to play, 1-0 for triggers');
});
