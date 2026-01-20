/**
 * JB200 Pitched Step Sequencer
 * 16 steps with per-step note, gate, accent, and slide
 * (Based on TB303 sequencer pattern)
 */

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Convert note name to MIDI number (C2 = 36)
export function noteToMidi(noteName) {
    const match = noteName.match(/^([A-G]#?)(\d)$/);
    if (!match) return 48; // Default to C3
    const [, note, octave] = match;
    const noteIndex = NOTES.indexOf(note);
    return (parseInt(octave) + 1) * 12 + noteIndex;
}

// Convert MIDI number to note name
export function midiToNote(midi) {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${NOTES[noteIndex]}${octave}`;
}

// Convert MIDI to frequency
export function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

export class JB200Sequencer {
    constructor(options = {}) {
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 120;
        this.running = false;
        this.currentStep = -1;
        this.nextStepTime = 0;
        this.scheduleAheadTime = 0.1; // seconds
        this.lookahead = 25; // ms

        // Pattern data: array of step objects
        this.pattern = this.createEmptyPattern();

        // Callbacks
        this.onStep = null; // (step, stepData, nextStepData) => void
        this.onStepChange = null; // (step) => void

        // Internal
        this.timerID = null;
        this.audioContext = null;
    }

    createEmptyPattern() {
        const pattern = [];
        for (let i = 0; i < this.steps; i++) {
            pattern.push({
                note: 'C2',
                gate: i === 0, // First step on by default
                accent: false,
                slide: false,
            });
        }
        return pattern;
    }

    setContext(context) {
        this.audioContext = context;
    }

    setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
    }

    getBpm() {
        return this.bpm;
    }

    getStepDuration() {
        // 16th notes at current BPM
        return 60 / this.bpm / 4;
    }

    setPattern(pattern) {
        if (Array.isArray(pattern) && pattern.length === this.steps) {
            this.pattern = pattern.map(step => ({
                note: step.note ?? 'C2',
                gate: step.gate ?? false,
                accent: step.accent ?? false,
                slide: step.slide ?? false,
            }));
        }
    }

    getPattern() {
        return this.pattern.map(step => ({ ...step }));
    }

    setStep(index, data) {
        if (index >= 0 && index < this.steps) {
            Object.assign(this.pattern[index], data);
        }
    }

    getStep(index) {
        if (index >= 0 && index < this.steps) {
            return { ...this.pattern[index] };
        }
        return null;
    }

    start() {
        if (this.running) return;
        if (!this.audioContext) {
            console.warn('JB200Sequencer: No audio context set');
            return;
        }

        this.running = true;
        this.currentStep = -1;
        this.nextStepTime = this.audioContext.currentTime;
        this.scheduler();
    }

    stop() {
        this.running = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        this.currentStep = -1;
        this.onStepChange?.(-1);
    }

    isRunning() {
        return this.running;
    }

    getCurrentStep() {
        return this.currentStep;
    }

    scheduler() {
        if (!this.running) return;

        const currentTime = this.audioContext.currentTime;

        while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.nextStepTime);
            this.advanceStep();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    scheduleStep(time) {
        const step = (this.currentStep + 1) % this.steps;
        const stepData = this.pattern[step];
        const nextStep = (step + 1) % this.steps;
        const nextStepData = this.pattern[nextStep];

        // Fire callback with step data
        if (this.onStep && stepData.gate) {
            this.onStep(step, {
                ...stepData,
                midi: noteToMidi(stepData.note),
                frequency: midiToFreq(noteToMidi(stepData.note)),
                time,
                duration: this.getStepDuration(),
            }, {
                ...nextStepData,
                midi: noteToMidi(nextStepData.note),
                frequency: midiToFreq(noteToMidi(nextStepData.note)),
            });
        }

        // Always notify of step change for UI
        this.onStepChange?.(step);
    }

    advanceStep() {
        this.currentStep = (this.currentStep + 1) % this.steps;
        this.nextStepTime += this.getStepDuration();
    }

    // Get next note for a cycle (used by UI)
    static cycleNote(currentNote, direction = 1) {
        const midi = noteToMidi(currentNote);
        const minMidi = 24; // C1
        const maxMidi = 60; // C4

        let newMidi = midi + direction;
        if (newMidi > maxMidi) newMidi = minMidi;
        if (newMidi < minMidi) newMidi = maxMidi;

        return midiToNote(newMidi);
    }
}

export default JB200Sequencer;
