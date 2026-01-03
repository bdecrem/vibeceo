// Berlin Dark Techno Audio Engine
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.bpm = 130;
        this.beatDuration = 60 / this.bpm;
        this.onBeat = null;
        this.onKick = null;
    }

    init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.audioContext.destination);
        this.startTime = this.audioContext.currentTime;
        
        // Resume AudioContext in case it's suspended (autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Create a kick drum (heavy Berlin-style)
    createKick(time, intensity = 1.0) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.frequency.setValueAtTime(150 * intensity, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.5);

        gain.gain.setValueAtTime(1.0 * intensity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.5);

        if (this.onKick) {
            setTimeout(() => this.onKick(), (time - this.audioContext.currentTime) * 1000);
        }
    }

    // Create hi-hat (industrial)
    createHiHat(time, open = false) {
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.3 : 0.05));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + (open ? 0.3 : 0.05));
    }

    // Create bass synth (deep sub-bass)
    createBass(time, note = 40, duration = 0.5) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = note;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    // Create industrial noise stab
    createNoiseStab(time, duration = 0.1) {
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + Math.random() * 3000;
        filter.Q.value = 10;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + duration);
    }

    // Pattern sequencer
    schedulePattern(startTime, duration) {
        const bars = Math.ceil(duration / (this.beatDuration * 4));
        const bassNotes = [40, 36, 43, 38]; // F, C, G, D (low)

        for (let bar = 0; bar < bars; bar++) {
            const barTime = startTime + (bar * this.beatDuration * 4);

            // Kick pattern (4/4 techno with variations)
            for (let beat = 0; beat < 4; beat++) {
                const beatTime = barTime + (beat * this.beatDuration);
                const intensity = beat === 0 ? 1.2 : 1.0;
                this.createKick(beatTime, intensity);

                // Hi-hats (off-beats)
                this.createHiHat(beatTime + this.beatDuration / 2, false);
                if (beat % 2 === 1) {
                    this.createHiHat(beatTime + this.beatDuration / 4, true);
                }

                // Beat callback
                if (this.onBeat) {
                    setTimeout(() => this.onBeat(beat), (beatTime - this.audioContext.currentTime) * 1000);
                }
            }

            // Bass line (evolving pattern)
            if (bar % 2 === 0) {
                this.createBass(barTime, bassNotes[bar % 4], this.beatDuration * 0.8);
                this.createBass(barTime + this.beatDuration * 1.5, bassNotes[(bar + 1) % 4], this.beatDuration * 0.4);
            }

            // Industrial stabs (random)
            if (Math.random() > 0.6) {
                this.createNoiseStab(barTime + this.beatDuration * (Math.random() * 4), 0.15);
            }
        }
    }

    start(duration = 35) {
        if (this.isPlaying) return;

        this.init();
        this.isPlaying = true;

        const now = this.audioContext.currentTime;
        this.schedulePattern(now + 0.1, duration);

        // Auto-stop
        setTimeout(() => this.stop(), duration * 1000);
    }

    stop() {
        if (this.audioContext) {
            this.audioContext.close();
            this.isPlaying = false;
        }
    }
}

window.AudioEngine = AudioEngine;