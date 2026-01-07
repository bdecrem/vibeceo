/**
 * TB-303 Acid Presets
 *
 * Classic acid house patterns with authentic note sequences.
 * Each preset includes pattern data and synth parameter settings.
 */

export const TB303_PRESETS = {
    // Classic ascending acid line
    acidLine1: {
        name: 'Acid Line 1',
        bpm: 130,
        parameters: {
            cutoff: 0.35,
            resonance: 0.75,
            envMod: 0.7,
            decay: 0.4,
            accent: 0.85,
        },
        waveform: 'sawtooth',
        pattern: [
            { note: 'C2', gate: true, accent: true, slide: false },
            { note: 'C2', gate: false, accent: false, slide: false },
            { note: 'C2', gate: true, accent: false, slide: false },
            { note: 'E2', gate: true, accent: false, slide: true },
            { note: 'G2', gate: true, accent: true, slide: false },
            { note: 'G2', gate: false, accent: false, slide: false },
            { note: 'A#2', gate: true, accent: false, slide: true },
            { note: 'C3', gate: true, accent: true, slide: false },
            { note: 'C2', gate: true, accent: false, slide: false },
            { note: 'C2', gate: false, accent: false, slide: false },
            { note: 'D#2', gate: true, accent: true, slide: false },
            { note: 'D#2', gate: true, accent: false, slide: true },
            { note: 'G2', gate: true, accent: false, slide: false },
            { note: 'G2', gate: false, accent: false, slide: false },
            { note: 'A#2', gate: true, accent: true, slide: true },
            { note: 'C3', gate: true, accent: false, slide: false },
        ],
    },

    // Phuture-style minimal
    phuture: {
        name: 'Phuture',
        bpm: 125,
        parameters: {
            cutoff: 0.25,
            resonance: 0.85,
            envMod: 0.8,
            decay: 0.5,
            accent: 0.9,
        },
        waveform: 'sawtooth',
        pattern: [
            { note: 'C2', gate: true, accent: true, slide: false },
            { note: 'C2', gate: false, accent: false, slide: false },
            { note: 'C2', gate: true, accent: false, slide: false },
            { note: 'C2', gate: false, accent: false, slide: false },
            { note: 'C2', gate: true, accent: true, slide: true },
            { note: 'D#2', gate: true, accent: false, slide: false },
            { note: 'D#2', gate: false, accent: false, slide: false },
            { note: 'C2', gate: true, accent: false, slide: false },
            { note: 'C2', gate: true, accent: true, slide: false },
            { note: 'C2', gate: false, accent: false, slide: false },
            { note: 'C2', gate: true, accent: false, slide: true },
            { note: 'G2', gate: true, accent: true, slide: false },
            { note: 'G2', gate: false, accent: false, slide: false },
            { note: 'D#2', gate: true, accent: false, slide: true },
            { note: 'C2', gate: true, accent: false, slide: false },
            { note: 'C2', gate: false, accent: false, slide: false },
        ],
    },

    // Fast squelchy techno
    squelch: {
        name: 'Squelch',
        bpm: 140,
        parameters: {
            cutoff: 0.2,
            resonance: 0.9,
            envMod: 0.9,
            decay: 0.3,
            accent: 0.95,
        },
        waveform: 'sawtooth',
        pattern: [
            { note: 'A1', gate: true, accent: true, slide: false },
            { note: 'A1', gate: true, accent: false, slide: false },
            { note: 'A2', gate: true, accent: true, slide: true },
            { note: 'G2', gate: true, accent: false, slide: true },
            { note: 'E2', gate: true, accent: true, slide: false },
            { note: 'E2', gate: false, accent: false, slide: false },
            { note: 'A1', gate: true, accent: false, slide: false },
            { note: 'A1', gate: true, accent: true, slide: true },
            { note: 'C2', gate: true, accent: false, slide: false },
            { note: 'C2', gate: true, accent: false, slide: true },
            { note: 'D2', gate: true, accent: true, slide: false },
            { note: 'D2', gate: false, accent: false, slide: false },
            { note: 'A1', gate: true, accent: false, slide: false },
            { note: 'A1', gate: true, accent: true, slide: true },
            { note: 'E2', gate: true, accent: false, slide: true },
            { note: 'G2', gate: true, accent: true, slide: false },
        ],
    },

    // Darker minor key
    darkAcid: {
        name: 'Dark Acid',
        bpm: 128,
        parameters: {
            cutoff: 0.3,
            resonance: 0.7,
            envMod: 0.6,
            decay: 0.6,
            accent: 0.8,
        },
        waveform: 'square',
        pattern: [
            { note: 'D2', gate: true, accent: true, slide: false },
            { note: 'D2', gate: false, accent: false, slide: false },
            { note: 'D2', gate: true, accent: false, slide: false },
            { note: 'F2', gate: true, accent: false, slide: true },
            { note: 'A2', gate: true, accent: true, slide: false },
            { note: 'A2', gate: true, accent: false, slide: true },
            { note: 'G#2', gate: true, accent: false, slide: true },
            { note: 'F2', gate: true, accent: true, slide: false },
            { note: 'D2', gate: true, accent: false, slide: false },
            { note: 'D2', gate: false, accent: false, slide: false },
            { note: 'D2', gate: true, accent: true, slide: true },
            { note: 'C2', gate: true, accent: false, slide: false },
            { note: 'D2', gate: true, accent: false, slide: false },
            { note: 'D2', gate: false, accent: false, slide: false },
            { note: 'F2', gate: true, accent: true, slide: true },
            { note: 'D2', gate: true, accent: false, slide: false },
        ],
    },

    // Hardfloor-style rolling
    rolling: {
        name: 'Rolling',
        bpm: 135,
        parameters: {
            cutoff: 0.4,
            resonance: 0.65,
            envMod: 0.75,
            decay: 0.35,
            accent: 0.85,
        },
        waveform: 'sawtooth',
        pattern: [
            { note: 'E2', gate: true, accent: true, slide: false },
            { note: 'E2', gate: true, accent: false, slide: false },
            { note: 'E2', gate: true, accent: false, slide: false },
            { note: 'E2', gate: true, accent: true, slide: true },
            { note: 'G2', gate: true, accent: false, slide: true },
            { note: 'A2', gate: true, accent: true, slide: false },
            { note: 'G2', gate: true, accent: false, slide: true },
            { note: 'E2', gate: true, accent: false, slide: false },
            { note: 'E2', gate: true, accent: true, slide: false },
            { note: 'E2', gate: true, accent: false, slide: false },
            { note: 'E2', gate: true, accent: false, slide: true },
            { note: 'B2', gate: true, accent: true, slide: false },
            { note: 'A2', gate: true, accent: false, slide: true },
            { note: 'G2', gate: true, accent: false, slide: true },
            { note: 'E2', gate: true, accent: true, slide: false },
            { note: 'E2', gate: false, accent: false, slide: false },
        ],
    },

    // Slower, hypnotic
    hypnotic: {
        name: 'Hypnotic',
        bpm: 118,
        parameters: {
            cutoff: 0.45,
            resonance: 0.6,
            envMod: 0.5,
            decay: 0.7,
            accent: 0.7,
        },
        waveform: 'sawtooth',
        pattern: [
            { note: 'G2', gate: true, accent: true, slide: false },
            { note: 'G2', gate: false, accent: false, slide: false },
            { note: 'G2', gate: false, accent: false, slide: false },
            { note: 'G2', gate: true, accent: false, slide: true },
            { note: 'A#2', gate: true, accent: false, slide: true },
            { note: 'C3', gate: true, accent: true, slide: false },
            { note: 'C3', gate: false, accent: false, slide: false },
            { note: 'C3', gate: false, accent: false, slide: false },
            { note: 'D3', gate: true, accent: false, slide: true },
            { note: 'C3', gate: true, accent: true, slide: false },
            { note: 'C3', gate: false, accent: false, slide: false },
            { note: 'A#2', gate: true, accent: false, slide: true },
            { note: 'G2', gate: true, accent: false, slide: false },
            { note: 'G2', gate: false, accent: false, slide: false },
            { note: 'G2', gate: false, accent: false, slide: false },
            { note: 'F2', gate: true, accent: true, slide: true },
        ],
    },

    // Aggressive, punchy
    punchy: {
        name: 'Punchy',
        bpm: 145,
        parameters: {
            cutoff: 0.5,
            resonance: 0.5,
            envMod: 0.85,
            decay: 0.25,
            accent: 1.0,
        },
        waveform: 'square',
        pattern: [
            { note: 'F2', gate: true, accent: true, slide: false },
            { note: 'F2', gate: true, accent: false, slide: false },
            { note: 'F3', gate: true, accent: true, slide: false },
            { note: 'F3', gate: false, accent: false, slide: false },
            { note: 'F2', gate: true, accent: false, slide: false },
            { note: 'F2', gate: true, accent: true, slide: true },
            { note: 'G#2', gate: true, accent: false, slide: false },
            { note: 'G#2', gate: false, accent: false, slide: false },
            { note: 'F2', gate: true, accent: true, slide: false },
            { note: 'F2', gate: true, accent: false, slide: false },
            { note: 'C3', gate: true, accent: true, slide: true },
            { note: 'A#2', gate: true, accent: false, slide: true },
            { note: 'G#2', gate: true, accent: true, slide: false },
            { note: 'G#2', gate: false, accent: false, slide: false },
            { note: 'F2', gate: true, accent: false, slide: true },
            { note: 'D#2', gate: true, accent: true, slide: false },
        ],
    },

    // Empty pattern for user editing
    empty: {
        name: 'Empty',
        bpm: 130,
        parameters: {
            cutoff: 0.5,
            resonance: 0.5,
            envMod: 0.5,
            decay: 0.5,
            accent: 0.8,
        },
        waveform: 'sawtooth',
        pattern: Array(16).fill(null).map(() => ({
            note: 'C2',
            gate: false,
            accent: false,
            slide: false,
        })),
    },
};

// Get preset names for UI dropdown
export function getPresetNames() {
    return Object.entries(TB303_PRESETS).map(([id, preset]) => ({
        id,
        name: preset.name,
    }));
}

// Get a specific preset
export function getPreset(id) {
    return TB303_PRESETS[id] ?? null;
}

export default TB303_PRESETS;
