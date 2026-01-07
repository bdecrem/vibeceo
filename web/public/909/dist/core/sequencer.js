/**
 * Lightweight TypeScript step sequencer.
 * Timing is handled via `setTimeout` for now; higher accuracy transports
 * (Tone.Transport, Web Workers, etc.) can plug in later.
 */

// Scale modes: determines step timing subdivision
// 16th: standard 16 steps per bar (default)
// 8th-triplet: 12 steps per bar (triplet feel)
// 16th-triplet: 24 steps per bar (shuffle)
// 32nd: 32 steps per bar (double-time for rolls)
const SCALE_MODES = {
    '16th': { stepsPerBeat: 4, label: '16th Notes' },
    '8th-triplet': { stepsPerBeat: 3, label: '8th Triplets' },
    '16th-triplet': { stepsPerBeat: 6, label: '16th Triplets' },
    '32nd': { stepsPerBeat: 8, label: '32nd Notes' },
};

export class StepSequencer {
    static MIN_BPM = 37;
    static MAX_BPM = 290;
    static SCALE_MODES = SCALE_MODES;

    constructor(options = {}) {
        this.patterns = new Map();
        this.currentStep = 0;
        this.running = false;
        this.steps = options.steps ?? 16;
        this.patternLength = options.patternLength ?? 16; // 1-16 steps
        this.bpm = this.clampBpm(options.bpm ?? 120);
        this.swing = options.swing ?? 0;
        this.scale = options.scale ?? '16th';
        this.globalAccent = options.globalAccent ?? 1.0; // 0-1 multiplier for accents
    }
    setBpm(bpm) {
        this.bpm = this.clampBpm(bpm);
        if (this.running) {
            this.restart();
        }
    }
    clampBpm(bpm) {
        return Math.max(StepSequencer.MIN_BPM, Math.min(StepSequencer.MAX_BPM, bpm));
    }
    setSwing(amount) {
        this.swing = Math.max(0, Math.min(1, amount));
    }
    getSwing() {
        return this.swing;
    }
    getBpm() {
        return this.bpm;
    }
    setSteps(steps) {
        this.steps = Math.max(1, Math.floor(steps));
        this.currentStep = 0;
    }
    // Pattern length: how many steps before the pattern loops (1-16)
    setPatternLength(length) {
        this.patternLength = Math.max(1, Math.min(16, Math.floor(length)));
        if (this.currentStep >= this.patternLength) {
            this.currentStep = 0;
        }
    }
    getPatternLength() {
        return this.patternLength;
    }
    // Scale mode: changes timing subdivision
    setScale(scale) {
        if (SCALE_MODES[scale]) {
            this.scale = scale;
            if (this.running) {
                this.restart();
            }
        }
    }
    getScale() {
        return this.scale;
    }
    getScaleModes() {
        return Object.keys(SCALE_MODES);
    }
    // Global accent: multiplier for all accented steps (0-1)
    setGlobalAccent(amount) {
        this.globalAccent = Math.max(0, Math.min(1, amount));
    }
    getGlobalAccent() {
        return this.globalAccent;
    }
    addPattern(id, pattern) {
        this.patterns.set(id, pattern);
        if (!this.currentPatternId) {
            this.loadPattern(id);
        }
    }
    loadPattern(id) {
        const pattern = this.patterns.get(id);
        if (!pattern) {
            throw new Error(`Pattern "${id}" not found`);
        }
        this.currentPatternId = id;
        this.currentPattern = pattern;
        this.currentStep = 0;
    }
    start() {
        if (!this.currentPattern) {
            throw new Error('No pattern selected for sequencer');
        }
        if (this.running) {
            return;
        }
        this.running = true;
        this.scheduleNextStep();
    }
    stop() {
        this.running = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        this.currentStep = 0;
    }
    isRunning() {
        return this.running;
    }
    getCurrentStep() {
        return this.currentStep;
    }
    getCurrentPatternId() {
        return this.currentPatternId;
    }
    chain(patternIds) {
        patternIds.forEach((id) => {
            if (!this.patterns.has(id)) {
                throw new Error(`Cannot chain missing pattern "${id}"`);
            }
        });
        // Simple chaining strategy for now: replace existing map iteration order
        patternIds.forEach((id, index) => {
            const pattern = this.patterns.get(id);
            this.patterns.delete(id);
            this.patterns.set(`${index}-${id}`, pattern);
        });
    }
    restart() {
        this.stop();
        this.start();
    }
    scheduleNextStep() {
        if (!this.running) {
            return;
        }
        const intervalMs = this.computeIntervalMs(this.currentStep);
        this.timer = setTimeout(() => {
            const events = this.collectEventsForStep(this.currentStep);
            this.onStep?.(this.currentStep, events);
            // Use patternLength for looping, not steps
            this.currentStep = (this.currentStep + 1) % this.patternLength;
            this.scheduleNextStep();
        }, intervalMs);
    }
    computeIntervalMs(step) {
        // Get steps per beat from scale mode
        const scaleMode = SCALE_MODES[this.scale] || SCALE_MODES['16th'];
        const stepsPerBeat = scaleMode.stepsPerBeat;
        // Base interval: 60s / bpm / stepsPerBeat
        const base = (60 / this.bpm / stepsPerBeat) * 1000;
        if (this.swing <= 0.0001) {
            return base;
        }
        const swingFactor = this.swing * 0.5;
        const isOddStep = step % 2 === 1;
        return base * (isOddStep ? 1 + swingFactor : 1 - swingFactor);
    }
    collectEventsForStep(step) {
        if (!this.currentPattern) {
            return [];
        }
        const events = [];
        for (const [voiceId, track] of Object.entries(this.currentPattern)) {
            const patternStep = this.getPatternStep(track, step);
            if (!patternStep)
                continue;
            if (typeof patternStep.probability === 'number' &&
                Math.random() > patternStep.probability) {
                continue;
            }
            events.push({
                voice: voiceId,
                step,
                velocity: patternStep.velocity,
                accent: patternStep.accent,
                globalAccent: this.globalAccent, // Pass global accent multiplier
            });
        }
        return events;
    }
    getPatternStep(track, step) {
        const normalizedIndex = step % track.length;
        const data = track[normalizedIndex];
        if (!data || data.velocity <= 0) {
            return undefined;
        }
        return data;
    }
}
//# sourceMappingURL=sequencer.js.map