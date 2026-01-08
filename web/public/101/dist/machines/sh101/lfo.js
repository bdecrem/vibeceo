/**
 * SH-101 LFO (Low Frequency Oscillator)
 *
 * Provides modulation with multiple waveforms:
 * - Triangle (smooth vibrato)
 * - Square (stepped, trills)
 * - Sample & Hold (random values)
 */

export class LFO {
    constructor(context) {
        this.context = context;

        // Main oscillator
        this.oscillator = context.createOscillator();
        this.oscillator.type = 'triangle';
        this.oscillator.frequency.value = 5; // 5 Hz default

        // For S&H, we use noise sampled at the LFO rate
        this.noiseBuffer = this.createNoiseBuffer();
        this.noiseSource = null; // Created when needed

        // Waveshapers for different outputs
        this.triangleOutput = context.createGain();
        this.triangleOutput.gain.value = 1;

        this.squareShaper = context.createWaveShaper();
        this.createSquareCurve();
        this.squareOutput = context.createGain();
        this.squareOutput.gain.value = 0;

        // S&H state
        this.shOutput = context.createGain();
        this.shOutput.gain.value = 0;
        this.shValue = 0;
        this.shInterval = null;

        // Mixed output with depth control
        this.mixer = context.createGain();
        this.mixer.gain.value = 1;

        this.depthGain = context.createGain();
        this.depthGain.gain.value = 0.5;

        // Output destinations
        this.pitchOutput = context.createGain();
        this.pitchOutput.gain.value = 0;

        this.filterOutput = context.createGain();
        this.filterOutput.gain.value = 0;

        this.pwmOutput = context.createGain();
        this.pwmOutput.gain.value = 0;

        // Connect paths
        this.oscillator.connect(this.triangleOutput);
        this.oscillator.connect(this.squareShaper);
        this.squareShaper.connect(this.squareOutput);

        this.triangleOutput.connect(this.mixer);
        this.squareOutput.connect(this.mixer);
        this.shOutput.connect(this.mixer);

        this.mixer.connect(this.depthGain);
        this.depthGain.connect(this.pitchOutput);
        this.depthGain.connect(this.filterOutput);
        this.depthGain.connect(this.pwmOutput);

        // State
        this.waveform = 'triangle';
        this.rate = 5;

        // Start
        this.oscillator.start();
    }

    /**
     * Create noise buffer for S&H
     */
    createNoiseBuffer() {
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    /**
     * Create square wave shaper curve
     */
    createSquareCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * 2 - 1;
            curve[i] = x >= 0 ? 1 : -1;
        }

        this.squareShaper.curve = curve;
    }

    /**
     * Set LFO rate (0-1 normalized to 0.1-30 Hz)
     */
    setRate(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));

        // Exponential mapping: 0.1 Hz to 30 Hz
        this.rate = 0.1 * Math.pow(300, normalized);
        this.oscillator.frequency.setValueAtTime(this.rate, when);

        // Update S&H interval if active
        if (this.waveform === 'sh' && this.shInterval) {
            this.stopSH();
            this.startSH();
        }
    }

    /**
     * Set LFO waveform
     * @param {string} type - 'triangle', 'square', or 'sh'
     */
    setWaveform(type) {
        const time = this.context.currentTime;

        // Mute all outputs first
        this.triangleOutput.gain.setValueAtTime(0, time);
        this.squareOutput.gain.setValueAtTime(0, time);
        this.shOutput.gain.setValueAtTime(0, time);

        // Stop S&H if running
        if (this.shInterval) {
            this.stopSH();
        }

        this.waveform = type;

        // Enable selected waveform
        switch (type) {
            case 'triangle':
                this.triangleOutput.gain.setValueAtTime(1, time);
                break;
            case 'square':
                this.squareOutput.gain.setValueAtTime(1, time);
                break;
            case 'sh':
                this.shOutput.gain.setValueAtTime(1, time);
                this.startSH();
                break;
        }
    }

    /**
     * Start Sample & Hold
     */
    startSH() {
        const intervalMs = (1000 / this.rate);

        this.shInterval = setInterval(() => {
            this.shValue = Math.random() * 2 - 1;
            const time = this.context.currentTime;

            // Create a constant source for S&H value
            // This is a bit hacky but works for our purposes
            this.shOutput.gain.setValueAtTime(this.shValue, time);
        }, intervalMs);
    }

    /**
     * Stop Sample & Hold
     */
    stopSH() {
        if (this.shInterval) {
            clearInterval(this.shInterval);
            this.shInterval = null;
        }
    }

    /**
     * Set modulation depth for pitch (in semitones)
     */
    setPitchDepth(semitones) {
        // Convert semitones to frequency ratio
        // This will be multiplied by the oscillator output (-1 to 1)
        this.pitchOutput.gain.value = semitones;
    }

    /**
     * Set modulation depth for filter (in octaves)
     */
    setFilterDepth(octaves) {
        this.filterOutput.gain.value = octaves;
    }

    /**
     * Set modulation depth for PWM (0-1 range)
     */
    setPwmDepth(depth) {
        this.pwmOutput.gain.value = Math.max(0, Math.min(0.45, depth)); // Max 45% to prevent silence
    }

    /**
     * Get pitch modulation output
     */
    getPitchOutput() {
        return this.pitchOutput;
    }

    /**
     * Get filter modulation output
     */
    getFilterOutput() {
        return this.filterOutput;
    }

    /**
     * Get PWM output
     */
    getPwmOutput() {
        return this.pwmOutput;
    }

    /**
     * Connect pitch modulation to a frequency param
     */
    connectToPitch(oscillatorFreq) {
        // This is tricky with Web Audio - we'd need to use an AudioWorklet
        // For now, we'll handle this in the main voice by polling
        return this.pitchOutput;
    }

    /**
     * Connect filter modulation
     */
    connectToFilter(filterFreq) {
        return this.filterOutput;
    }

    /**
     * Disconnect all
     */
    disconnect() {
        this.pitchOutput.disconnect();
        this.filterOutput.disconnect();
        this.pwmOutput.disconnect();
    }

    /**
     * Stop LFO (cleanup)
     */
    stop() {
        this.oscillator.stop();
        this.stopSH();
    }
}

export default LFO;
