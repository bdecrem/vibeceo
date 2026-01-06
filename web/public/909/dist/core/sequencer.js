/**
 * Lightweight TypeScript step sequencer.
 * Timing is handled via `setTimeout` for now; higher accuracy transports
 * (Tone.Transport, Web Workers, etc.) can plug in later.
 */
export class StepSequencer {
    constructor(options = {}) {
        this.patterns = new Map();
        this.currentStep = 0;
        this.running = false;
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 120;
        this.swing = options.swing ?? 0;
    }
    setBpm(bpm) {
        this.bpm = bpm;
        if (this.running) {
            this.restart();
        }
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
            this.currentStep = (this.currentStep + 1) % this.steps;
            this.scheduleNextStep();
        }, intervalMs);
    }
    computeIntervalMs(step) {
        const base = (60 / this.bpm / 4) * 1000; // 16th note
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