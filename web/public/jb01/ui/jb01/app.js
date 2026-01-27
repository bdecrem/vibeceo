/**
 * JB01 Drum Machine UI Application
 *
 * Handles all UI interactions: knobs, sequencer grid, transport controls,
 * mute buttons, and modals.
 */

import { JB01Engine, VOICES as ENGINE_VOICES } from '../../dist/machines/jb01/engine.js';

// Audio engine
let engine = null;

const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];
const STEPS = 16;

// State
const state = {
    bpm: 120,
    swing: 0,
    playing: false,
    currentStep: -1,
    currentPage: 1,
    pattern: {},
    params: {},
    muted: {},
};

// Initialize pattern and params for each voice
VOICES.forEach(voice => {
    state.pattern[voice] = Array(STEPS).fill(false);
    state.params[voice] = {};
    state.muted[voice] = false;
});

// ========================================
// Knob Interaction
// ========================================

let activeKnob = null;
let knobStartY = 0;
let knobStartValue = 0;
let dragStartedInPage = false; // Track if drag originated from our knob

function initKnobs() {
    const knobs = document.querySelectorAll('.knob');

    knobs.forEach(knob => {
        const voice = knob.dataset.voice;
        const param = knob.dataset.param;
        const min = parseFloat(knob.dataset.min);
        const max = parseFloat(knob.dataset.max);
        const defaultVal = parseFloat(knob.dataset.default);

        // Initialize state
        state.params[voice][param] = defaultVal;

        // Update visual
        updateKnobVisual(knob, defaultVal, min, max);

        // Queue parameter sync to engine (will be applied after engine init)
        if (!state._pendingParams) state._pendingParams = [];
        state._pendingParams.push({ voice, param, value: defaultVal });

        // Mouse events
        knob.addEventListener('mousedown', (e) => startKnobDrag(e, knob));

        // Touch events
        knob.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startKnobDrag(e.touches[0], knob);
        }, { passive: false });

        // Double-click to reset
        knob.addEventListener('dblclick', () => {
            state.params[voice][param] = defaultVal;
            updateKnobVisual(knob, defaultVal, min, max);
            updateKnobValueDisplay(knob, defaultVal, param);
        });
    });

    // Global drag handlers
    document.addEventListener('mousemove', handleKnobDrag);
    document.addEventListener('mouseup', stopKnobDrag);
    document.addEventListener('touchmove', (e) => {
        if (activeKnob) {
            e.preventDefault();
            handleKnobDrag(e.touches[0]);
        }
    }, { passive: false });
    document.addEventListener('touchend', stopKnobDrag);

    // Clear drag state if mouse leaves the document (edge case handling)
    document.addEventListener('mouseleave', () => {
        if (activeKnob) {
            console.log('mouseleave: clearing activeKnob due to mouse leaving document');
            stopKnobDrag();
        }
    });
}

function startKnobDrag(e, knob) {
    activeKnob = knob;
    knobStartY = e.clientY;
    dragStartedInPage = true;

    const voice = knob.dataset.voice;
    const param = knob.dataset.param;
    knobStartValue = state.params[voice][param];
    console.log(`startKnobDrag: ${voice}.${param}, startY=${knobStartY}, startValue=${knobStartValue}`);

    knob.classList.add('dragging');
}

function handleKnobDrag(e) {
    if (!activeKnob || !dragStartedInPage) return;

    // Safety check: if no mouse button is pressed during move, clear the drag state
    // This handles edge cases where mouseup was missed (mouse left window, etc.)
    if (e.buttons === 0) {
        console.log('handleKnobDrag: no buttons pressed, clearing stale drag state');
        stopKnobDrag();
        return;
    }

    // Additional safety: ignore if event target is outside the document body
    // This helps prevent window drag events from being processed
    if (!document.body.contains(e.target)) {
        console.log('handleKnobDrag: event target outside document, ignoring');
        return;
    }

    const voice = activeKnob.dataset.voice;
    const param = activeKnob.dataset.param;
    const min = parseFloat(activeKnob.dataset.min);
    const max = parseFloat(activeKnob.dataset.max);

    // Calculate delta (inverted: drag up = increase)
    const deltaY = knobStartY - e.clientY;
    const range = max - min;
    const sensitivity = range / 100; // 100px = full range

    let newValue = knobStartValue + (deltaY * sensitivity);
    newValue = Math.max(min, Math.min(max, newValue));

    // Round based on range
    if (range <= 24) {
        newValue = Math.round(newValue); // Integers for tune, level
    } else {
        newValue = Math.round(newValue); // Integers for 0-100 params
    }

    state.params[voice][param] = newValue;
    updateKnobVisual(activeKnob, newValue, min, max);
    updateKnobValueDisplay(activeKnob, newValue, param);

    // Send to engine with conversion
    setEngineParam(voice, param, newValue);
}

function stopKnobDrag() {
    if (activeKnob || dragStartedInPage) {
        console.log('stopKnobDrag: clearing drag state');
        if (activeKnob) activeKnob.classList.remove('dragging');
        activeKnob = null;
        dragStartedInPage = false;
    }
}

// Convert producer-friendly values to engine units and set on engine
function setEngineParam(voice, param, value) {
    if (!engine) return;
    console.log(`setEngineParam: ${voice}.${param} = ${value}`);

    let engineValue;
    switch (param) {
        case 'level':
            // dB to linear: -60 to +6 dB -> 0 to ~2
            engineValue = Math.pow(10, value / 20);
            break;
        case 'tune':
            // Semitones to cents
            engineValue = value * 100;
            break;
        default:
            // 0-100 -> 0-1
            engineValue = value / 100;
            break;
    }

    const voiceObj = engine.voices.get(voice);
    if (voiceObj) {
        voiceObj.setParameter(param, engineValue);
    }
}

function updateKnobVisual(knob, value, min, max) {
    // Map value to rotation (-135deg to +135deg, total 270deg range)
    const normalized = (value - min) / (max - min);
    const rotation = -135 + (normalized * 270);

    // Use CSS transform on the ::after pseudo-element via custom property
    knob.style.setProperty('--knob-rotation', `${rotation}deg`);
}

function updateKnobValueDisplay(knob, value, param) {
    const valueEl = knob.parentElement.querySelector('.knob-value');
    if (!valueEl) return;

    if (param === 'level') {
        valueEl.textContent = value > 0 ? `+${value}dB` : `${value}dB`;
    } else if (param === 'tune') {
        valueEl.textContent = value > 0 ? `+${value}` : `${value}`;
    } else {
        valueEl.textContent = value;
    }
}

// ========================================
// Sequencer
// ========================================

function renderSequencer() {
    const container = document.getElementById('sequencer');
    if (!container) return;

    // Clear existing rows (keep header)
    const existingRows = container.querySelectorAll('.voice-row');
    existingRows.forEach(row => row.remove());

    // Render step numbers
    renderStepNumbers();

    // Render voice rows
    VOICES.forEach(voice => {
        const row = document.createElement('div');
        row.className = 'voice-row';
        row.dataset.voice = voice;

        // Voice label
        const label = document.createElement('div');
        label.className = `voice-label ${voice}`;
        label.textContent = voice.toUpperCase();
        label.addEventListener('click', () => triggerVoice(voice));
        row.appendChild(label);

        // Steps container
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'seq-steps';
        stepsContainer.dataset.voice = voice;

        for (let i = 0; i < STEPS; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.step = i;
            step.dataset.voice = voice;

            if (state.pattern[voice][i]) {
                step.classList.add('active');
            }

            step.addEventListener('click', () => toggleStep(voice, i));
            step.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleAccent(voice, i);
            });

            stepsContainer.appendChild(step);
        }

        row.appendChild(stepsContainer);
        container.appendChild(row);
    });

    // Apply current page
    updateStepPage(state.currentPage);
}

function renderStepNumbers() {
    const container = document.getElementById('step-numbers');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < STEPS; i++) {
        const num = document.createElement('div');
        num.className = 'step-number';
        num.textContent = i + 1;
        container.appendChild(num);
    }
}

function toggleStep(voice, stepIndex) {
    state.pattern[voice][stepIndex] = !state.pattern[voice][stepIndex];

    const stepEl = document.querySelector(`.seq-steps[data-voice="${voice}"] .step[data-step="${stepIndex}"]`);
    if (stepEl) {
        stepEl.classList.toggle('active', state.pattern[voice][stepIndex]);
    }

    // Trigger preview if turning on
    if (state.pattern[voice][stepIndex]) {
        triggerVoice(voice);
    }
}

function toggleAccent(voice, stepIndex) {
    const stepEl = document.querySelector(`.seq-steps[data-voice="${voice}"] .step[data-step="${stepIndex}"]`);
    if (stepEl && stepEl.classList.contains('active')) {
        stepEl.classList.toggle('accent');
    }
}

function triggerVoice(voice, velocity = 1) {
    // Visual feedback
    const label = document.querySelector(`.voice-label.${voice}`);
    if (label) {
        label.style.transform = 'scale(0.95)';
        setTimeout(() => {
            label.style.transform = '';
        }, 100);
    }

    // Trigger audio
    if (engine && !state.muted[voice]) {
        engine.trigger(voice, velocity);
    }
}

// ========================================
// Step Paging (Mobile)
// ========================================

function initStepPaging() {
    const pageBtns = document.querySelectorAll('.step-page-btn');

    pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            updateStepPage(page);
        });
    });
}

function updateStepPage(page) {
    state.currentPage = page;

    // Update button states
    document.querySelectorAll('.step-page-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.page) === page);
    });

    // Update step visibility
    document.querySelectorAll('.seq-steps').forEach(container => {
        container.classList.toggle('page-2', page === 2);
    });

    // Update step numbers visibility
    const stepNumbers = document.getElementById('step-numbers');
    if (stepNumbers) {
        stepNumbers.classList.toggle('page-2', page === 2);
    }
}

// ========================================
// Mute Buttons
// ========================================

function initMuteButtons() {
    const muteBtns = document.querySelectorAll('.mute-btn');

    muteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const voice = btn.dataset.voice;
            state.muted[voice] = !state.muted[voice];
            btn.classList.toggle('active', state.muted[voice]);

            // Also dim the voice channel
            const channel = document.querySelector(`.voice-channel[data-voice="${voice}"]`);
            if (channel) {
                channel.style.opacity = state.muted[voice] ? '0.5' : '1';
            }

            updateStatus(state.muted[voice] ? `${voice.toUpperCase()} muted` : `${voice.toUpperCase()} unmuted`);
        });
    });
}

// ========================================
// Transport
// ========================================

function initTransport() {
    const playBtn = document.getElementById('play-btn');
    const bpmInput = document.getElementById('bpm-input');
    const swingInput = document.getElementById('swing-input');
    const swingValue = document.getElementById('swing-value');

    if (playBtn) {
        playBtn.addEventListener('click', togglePlay);
    }

    if (bpmInput) {
        bpmInput.addEventListener('change', (e) => {
            state.bpm = parseInt(e.target.value) || 120;
            state.bpm = Math.max(60, Math.min(200, state.bpm));
            e.target.value = state.bpm;
        });
    }

    if (swingInput && swingValue) {
        swingInput.addEventListener('input', (e) => {
            state.swing = parseInt(e.target.value) || 0;
            swingValue.textContent = `${state.swing}%`;
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Space to play/stop
        if (e.code === 'Space' && !e.target.matches('input')) {
            e.preventDefault();
            togglePlay();
        }

        // 1-8 to trigger voices
        const keyNum = parseInt(e.key);
        if (keyNum >= 1 && keyNum <= 8) {
            triggerVoice(VOICES[keyNum - 1]);
        }
    });
}

let playIntervalId = null;

function togglePlay() {
    state.playing = !state.playing;

    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.textContent = state.playing ? 'STOP' : 'PLAY';
        playBtn.classList.toggle('playing', state.playing);
    }

    if (state.playing) {
        startSequencer();
    } else {
        stopSequencer();
    }
}

function startSequencer() {
    state.currentStep = -1;

    const stepDuration = () => {
        const beatDuration = 60000 / state.bpm;
        return beatDuration / 4; // 16th notes
    };

    const tick = () => {
        // Clear previous step highlight
        document.querySelectorAll('.step.playing').forEach(el => {
            el.classList.remove('playing');
        });

        // Advance step
        state.currentStep = (state.currentStep + 1) % STEPS;

        // Highlight current step
        VOICES.forEach(voice => {
            const stepEl = document.querySelector(`.seq-steps[data-voice="${voice}"] .step[data-step="${state.currentStep}"]`);
            if (stepEl) {
                stepEl.classList.add('playing');
            }

            // Trigger voice if step is active and not muted
            if (state.pattern[voice][state.currentStep] && !state.muted[voice]) {
                triggerVoice(voice);
            }
        });

        // Update page indicator if playing step is on other page
        const page = state.currentStep < 8 ? 1 : 2;
        document.querySelectorAll('.step-page-btn').forEach(btn => {
            btn.classList.toggle('has-playing', parseInt(btn.dataset.page) === page);
        });

        // Schedule next tick
        if (state.playing) {
            playIntervalId = setTimeout(tick, stepDuration());
        }
    };

    tick();
}

function stopSequencer() {
    if (playIntervalId) {
        clearTimeout(playIntervalId);
        playIntervalId = null;
    }

    state.currentStep = -1;

    // Clear all playing highlights
    document.querySelectorAll('.step.playing').forEach(el => {
        el.classList.remove('playing');
    });

    document.querySelectorAll('.step-page-btn').forEach(btn => {
        btn.classList.remove('has-playing');
    });
}

// ========================================
// Modals
// ========================================

function initModals() {
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const helpClose = document.getElementById('help-close');

    if (helpBtn && helpModal) {
        helpBtn.addEventListener('click', () => {
            helpModal.classList.add('active');
        });
    }

    if (helpClose && helpModal) {
        helpClose.addEventListener('click', () => {
            helpModal.classList.remove('active');
        });
    }

    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            updateStatus('Export not yet implemented');
        });
    }

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            updateStatus('Share not yet implemented');
        });
    }
}

// ========================================
// Status
// ========================================

function updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;

        // Clear after 2 seconds
        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = 'Ready';
            }
        }, 2000);
    }
}

// ========================================
// CSS for knob rotation
// ========================================

function injectKnobRotationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .knob::after {
            transform: translateX(-50%) rotate(var(--knob-rotation, 0deg));
            transform-origin: center calc(100% + 8px);
        }
    `;
    document.head.appendChild(style);
}

// ========================================
// Initialize
// ========================================

async function initEngine() {
    console.log('initEngine: starting');
    try {
        engine = new JB01Engine({ bpm: state.bpm });
        window.engine = engine; // Expose for debugging
        console.log('JB01 Engine initialized (context may be suspended)');

        // Sync all knob values to engine (fixes mismatch between UI defaults and engine defaults)
        if (state._pendingParams) {
            console.log(`Syncing ${state._pendingParams.length} parameters to engine`);
            state._pendingParams.forEach(({ voice, param, value }) => {
                setEngineParam(voice, param, value);
            });
            delete state._pendingParams;
        }

        // Update status to show audio context state
        const updateAudioStatus = () => {
            const state = engine.context.state;
            if (state === 'suspended') {
                updateStatus('Click anywhere to enable audio');
            } else if (state === 'running') {
                updateStatus('Ready');
            }
        };

        // Resume audio context on first user interaction
        const resumeAudio = async () => {
            if (engine.context.state === 'suspended') {
                await engine.context.resume();
                console.log('Audio context resumed');
                updateStatus('Audio enabled');
            }
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        };
        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);

        // Show initial state
        updateAudioStatus();
    } catch (e) {
        console.error('initEngine error:', e);
        updateStatus('Audio error: ' + e.message);
    }
}

async function init() {
    console.log('init: starting');
    injectKnobRotationStyles();
    initKnobs();
    renderSequencer();
    initStepPaging();
    initMuteButtons();
    initTransport();
    initModals();

    console.log('init: calling initEngine');
    await initEngine();
    console.log('init: done');
    updateStatus('Ready');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
} else {
    init().catch(console.error);
}
