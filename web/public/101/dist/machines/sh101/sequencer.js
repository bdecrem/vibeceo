/**
 * SH-101 Sequencer & Arpeggiator
 *
 * 16-step sequencer with:
 * - Note, gate, accent, slide per step
 * - Arpeggiator modes: up, down, up-down
 * - Hold/latch feature
 * - Octave range control
 */

export class Sequencer {
    constructor(options = {}) {
        this.steps = 16;
        this.pattern = this.createEmptyPattern();
        this.currentStep = 0;
        this.bpm = options.bpm ?? 120;
        this.playing = false;
        this.recording = false;
        this.interval = null;

        // Gate length as fraction of step (0.25, 0.5, 0.75, 1.0)
        this.gateLength = 0.75;

        // Callbacks
        this.onStep = null;
        this.onNote = null;
    }

    /**
     * Create empty 16-step pattern
     */
    createEmptyPattern() {
        return Array(this.steps).fill(null).map(() => ({
            note: 'C3',
            gate: false,
            accent: false,
            slide: false,
        }));
    }

    /**
     * Set pattern
     */
    setPattern(pattern) {
        this.pattern = pattern.slice(0, this.steps);
        while (this.pattern.length < this.steps) {
            this.pattern.push({ note: 'C3', gate: false, accent: false, slide: false });
        }
    }

    /**
     * Get pattern
     */
    getPattern() {
        return [...this.pattern];
    }

    /**
     * Set step data
     */
    setStep(index, data) {
        if (index >= 0 && index < this.steps) {
            this.pattern[index] = { ...this.pattern[index], ...data };
        }
    }

    /**
     * Get step data
     */
    getStep(index) {
        return this.pattern[index];
    }

    /**
     * Set BPM
     */
    setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
        if (this.playing) {
            this.stop();
            this.start();
        }
    }

    /**
     * Get BPM
     */
    getBpm() {
        return this.bpm;
    }

    /**
     * Set gate length
     */
    setGateLength(length) {
        this.gateLength = Math.max(0.1, Math.min(1.0, length));
    }

    /**
     * Start sequencer
     */
    start() {
        if (this.playing) return;

        this.playing = true;
        this.currentStep = 0;

        const stepMs = (60 / this.bpm) / 4 * 1000; // 16th notes

        this.interval = setInterval(() => {
            this.tick();
        }, stepMs);
    }

    /**
     * Stop sequencer
     */
    stop() {
        this.playing = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Check if playing
     */
    isPlaying() {
        return this.playing;
    }

    /**
     * Process one step
     */
    tick() {
        const step = this.pattern[this.currentStep];

        if (this.onStep) {
            this.onStep(this.currentStep, step);
        }

        if (step.gate && this.onNote) {
            this.onNote(this.currentStep, step);
        }

        this.currentStep = (this.currentStep + 1) % this.steps;
    }

    /**
     * Get current step index
     */
    getCurrentStep() {
        return this.currentStep;
    }

    /**
     * Enable recording mode
     */
    startRecording() {
        this.recording = true;
        this.currentStep = 0;
    }

    /**
     * Disable recording mode
     */
    stopRecording() {
        this.recording = false;
    }

    /**
     * Record a note at current step
     */
    recordNote(note, accent = false) {
        if (!this.recording) return;

        this.pattern[this.currentStep] = {
            note,
            gate: true,
            accent,
            slide: false,
        };

        this.currentStep = (this.currentStep + 1) % this.steps;
    }

    /**
     * Record a rest at current step
     */
    recordRest() {
        if (!this.recording) return;

        this.pattern[this.currentStep] = {
            note: this.pattern[this.currentStep].note,
            gate: false,
            accent: false,
            slide: false,
        };

        this.currentStep = (this.currentStep + 1) % this.steps;
    }

    /**
     * Clear pattern
     */
    clear() {
        this.pattern = this.createEmptyPattern();
        this.currentStep = 0;
    }
}

/**
 * Arpeggiator
 */
export class Arpeggiator {
    constructor(options = {}) {
        this.mode = 'up'; // 'up', 'down', 'updown', 'random'
        this.heldNotes = [];
        this.currentIndex = 0;
        this.direction = 1;
        this.octaves = 1;
        this.hold = false;
        this.bpm = options.bpm ?? 120;
        this.playing = false;
        this.interval = null;

        // Callbacks
        this.onNote = null;
    }

    /**
     * Set arp mode
     */
    setMode(mode) {
        this.mode = mode;
        this.currentIndex = 0;
        this.direction = 1;
    }

    /**
     * Get current mode
     */
    getMode() {
        return this.mode;
    }

    /**
     * Set hold mode
     */
    setHold(hold) {
        this.hold = hold;
        if (!hold) {
            // Only keep currently pressed notes (handled by caller)
        }
    }

    /**
     * Get hold state
     */
    getHold() {
        return this.hold;
    }

    /**
     * Set octave range
     */
    setOctaves(octaves) {
        this.octaves = Math.max(1, Math.min(4, octaves));
    }

    /**
     * Add note to arpeggiator
     */
    noteOn(note) {
        // Convert to MIDI if string
        const midiNote = typeof note === 'string' ? this.noteNameToMidi(note) : note;

        if (!this.heldNotes.includes(midiNote)) {
            this.heldNotes.push(midiNote);
            this.heldNotes.sort((a, b) => a - b);
        }
    }

    /**
     * Remove note from arpeggiator
     */
    noteOff(note) {
        if (this.hold) return; // Don't remove in hold mode

        const midiNote = typeof note === 'string' ? this.noteNameToMidi(note) : note;
        this.heldNotes = this.heldNotes.filter(n => n !== midiNote);
    }

    /**
     * Clear all notes
     */
    clear() {
        this.heldNotes = [];
        this.currentIndex = 0;
    }

    /**
     * Convert note name to MIDI
     */
    noteNameToMidi(noteName) {
        const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
        const match = noteName.match(/^([A-G])([#b]?)(\d+)$/);
        if (!match) return 60;

        let note = noteMap[match[1]];
        if (match[2] === '#') note += 1;
        if (match[2] === 'b') note -= 1;
        const octave = parseInt(match[3]);

        return note + (octave + 1) * 12;
    }

    /**
     * Get full note list with octave expansion
     */
    getExpandedNotes() {
        const notes = [];
        for (let oct = 0; oct < this.octaves; oct++) {
            this.heldNotes.forEach(note => {
                notes.push(note + (oct * 12));
            });
        }
        return notes;
    }

    /**
     * Get next note in arpeggio
     */
    getNextNote() {
        if (this.heldNotes.length === 0) return null;

        const notes = this.getExpandedNotes();
        let note;

        switch (this.mode) {
            case 'up':
                note = notes[this.currentIndex % notes.length];
                this.currentIndex = (this.currentIndex + 1) % notes.length;
                break;

            case 'down':
                const downIndex = notes.length - 1 - (this.currentIndex % notes.length);
                note = notes[downIndex];
                this.currentIndex = (this.currentIndex + 1) % notes.length;
                break;

            case 'updown':
                note = notes[this.currentIndex];
                this.currentIndex += this.direction;

                if (this.currentIndex >= notes.length - 1) {
                    this.direction = -1;
                    this.currentIndex = notes.length - 1;
                } else if (this.currentIndex <= 0) {
                    this.direction = 1;
                    this.currentIndex = 0;
                }
                break;

            case 'random':
                note = notes[Math.floor(Math.random() * notes.length)];
                break;

            default:
                note = notes[0];
        }

        return note;
    }

    /**
     * Set BPM
     */
    setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
        if (this.playing) {
            this.stop();
            this.start();
        }
    }

    /**
     * Start arpeggiator
     */
    start() {
        if (this.playing) return;
        this.playing = true;

        const stepMs = (60 / this.bpm) / 4 * 1000;

        this.interval = setInterval(() => {
            const note = this.getNextNote();
            if (note !== null && this.onNote) {
                this.onNote(note);
            }
        }, stepMs);
    }

    /**
     * Stop arpeggiator
     */
    stop() {
        this.playing = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Check if playing
     */
    isPlaying() {
        return this.playing;
    }
}

export default Sequencer;
