// Helper to convert step indices to PatternStep array
function stepsFromIndices(indices, accents = [], length = 16) {
    return Array.from({ length }, (_, i) => ({
        velocity: indices.includes(i) ? (accents.includes(i) ? 1 : 0.7) : 0,
        accent: accents.includes(i),
    }));
}
// Classic four-on-floor techno
export const technoBasic = {
    id: 'techno-basic',
    name: 'Techno Basic',
    description: 'Classic four-on-floor with offbeat hats',
    bpm: 130,
    pattern: {
        kick: stepsFromIndices([0, 4, 8, 12], [0, 8]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([2, 6, 10, 14]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([]),
    },
};
// Detroit techno with rim accents
export const detroitShuffle = {
    id: 'detroit-shuffle',
    name: 'Detroit Shuffle',
    description: 'Syncopated Detroit groove with rim shots',
    bpm: 125,
    pattern: {
        kick: stepsFromIndices([0, 6, 8, 14], [0]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([2, 10], [10]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([4, 12]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([]),
    },
};
// Classic Chicago house
export const houseClassic = {
    id: 'house-classic',
    name: 'House Classic',
    description: 'Chicago house with open hats on upbeats',
    bpm: 122,
    pattern: {
        kick: stepsFromIndices([0, 4, 8, 12], [0]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 4, 8, 12]),
        oh: stepsFromIndices([2, 6, 10, 14], [6, 14]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([]),
    },
};
// Syncopated breakbeat
export const breakbeat = {
    id: 'breakbeat',
    name: 'Breakbeat',
    description: 'Syncopated kick and snare pattern',
    bpm: 135,
    pattern: {
        kick: stepsFromIndices([0, 3, 6, 10, 12], [0, 12]),
        snare: stepsFromIndices([4, 11, 14], [4]),
        clap: stepsFromIndices([]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([]),
        crash: stepsFromIndices([0]),
        ride: stepsFromIndices([]),
    },
};
// Minimal accent-driven
export const minimal = {
    id: 'minimal',
    name: 'Minimal',
    description: 'Sparse, accent-driven pattern',
    bpm: 128,
    pattern: {
        kick: stepsFromIndices([0, 8], [0]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([6, 14]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 4, 8, 12]),
        oh: stepsFromIndices([]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([2, 6, 10, 14]),
    },
};
// Acid house with tom fills
export const acidHouse = {
    id: 'acid-house',
    name: 'Acid House',
    description: 'Driving acid pattern with tom accents',
    bpm: 126,
    pattern: {
        kick: stepsFromIndices([0, 4, 8, 12], [0, 4, 8, 12]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([14]),
        mtom: stepsFromIndices([13]),
        htom: stepsFromIndices([11]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([2, 10]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([]),
    },
};
// Electro funk
export const electroFunk = {
    id: 'electro-funk',
    name: 'Electro Funk',
    description: 'Funky electro groove with snare rolls',
    bpm: 115,
    pattern: {
        kick: stepsFromIndices([0, 5, 8, 13], [0, 8]),
        snare: stepsFromIndices([4, 7, 12, 15], [4, 12]),
        clap: stepsFromIndices([]),
        rimshot: stepsFromIndices([2, 10]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([6, 14]),
        crash: stepsFromIndices([0]),
        ride: stepsFromIndices([]),
    },
};
// Industrial driving beat
export const industrial = {
    id: 'industrial',
    name: 'Industrial',
    description: 'Relentless industrial stomp',
    bpm: 140,
    pattern: {
        kick: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14], [0, 4, 8, 12]),
        snare: stepsFromIndices([4, 12], [4, 12]),
        clap: stepsFromIndices([]),
        rimshot: stepsFromIndices([1, 3, 5, 7, 9, 11, 13, 15]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([]),
        oh: stepsFromIndices([]),
        crash: stepsFromIndices([0]),
        ride: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
    },
};
// All presets as a collection
export const TR909_PRESETS = [
    technoBasic,
    detroitShuffle,
    houseClassic,
    breakbeat,
    minimal,
    acidHouse,
    electroFunk,
    industrial,
];
// Get preset by ID
export function getPreset(id) {
    return TR909_PRESETS.find((p) => p.id === id);
}
// List all preset IDs
export function listPresetIds() {
    return TR909_PRESETS.map((p) => p.id);
}
//# sourceMappingURL=presets.js.map