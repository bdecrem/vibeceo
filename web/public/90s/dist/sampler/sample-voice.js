/**
 * SampleVoice - A sample player with 6 controls
 *
 * Parameters:
 * - level: 0-1 (volume)
 * - tune: -12 to +12 (semitones)
 * - attack: 0-1 (fade in time, 0=instant, 1=1 second)
 * - decay: 0-1 (percentage of sample length, 1=full)
 * - filter: 0-1 (lowpass cutoff, 0=dark, 1=bright)
 * - pan: -1 to +1 (stereo position)
 */

export class SampleVoice {
  constructor(id, context) {
    this.id = id;
    this.context = context;
    this.buffer = null;
    this.name = '';
    this.shortName = '';

    // Default parameters
    this.params = {
      level: 0.8,
      tune: 0,
      attack: 0,
      decay: 1,
      filter: 1,  // Fully open by default
      pan: 0
    };

    // Output routing: filter -> panner -> output
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;  // Start fully open
    this.filter.Q.value = 0.7;  // Gentle resonance

    this.panner = context.createStereoPanner();
    this.output = context.createGain();

    this.filter.connect(this.panner);
    this.panner.connect(this.output);

    // Track active sources for choke
    this.activeSource = null;
  }

  /**
   * Load an audio buffer
   */
  setBuffer(buffer) {
    this.buffer = buffer;
  }

  /**
   * Set voice metadata
   */
  setMeta(name, shortName) {
    this.name = name;
    this.shortName = shortName;
  }

  /**
   * Connect output to destination
   */
  connect(destination) {
    this.output.connect(destination);
  }

  /**
   * Disconnect output
   */
  disconnect() {
    this.output.disconnect();
  }

  /**
   * Set a parameter
   */
  setParameter(name, value) {
    if (name in this.params) {
      this.params[name] = value;

      // Apply pan immediately
      if (name === 'pan') {
        this.panner.pan.value = value;
      }

      // Apply filter cutoff immediately (logarithmic scale: 100Hz to 20kHz)
      if (name === 'filter') {
        const minFreq = 100;
        const maxFreq = 20000;
        const freq = minFreq * Math.pow(maxFreq / minFreq, value);
        this.filter.frequency.value = freq;
      }
    }
  }

  /**
   * Get a parameter value
   */
  getParameter(name) {
    return this.params[name];
  }

  /**
   * Get all parameters
   */
  getParameters() {
    return { ...this.params };
  }

  /**
   * Parameter descriptors for UI
   */
  get parameterDescriptors() {
    return {
      level: { min: 0, max: 1, default: 0.8, label: 'Level' },
      tune: { min: -12, max: 12, default: 0, label: 'Tune' },
      attack: { min: 0, max: 1, default: 0, label: 'Attack' },
      decay: { min: 0, max: 1, default: 1, label: 'Decay' },
      filter: { min: 0, max: 1, default: 1, label: 'Filter' },
      pan: { min: -1, max: 1, default: 0, label: 'Pan' }
    };
  }

  /**
   * Trigger the sample
   */
  trigger(time, velocity = 1) {
    if (!this.buffer) return;

    const when = time ?? this.context.currentTime;

    // Choke previous sound
    if (this.activeSource) {
      try {
        this.activeSource.stop(when);
      } catch (e) {
        // Already stopped
      }
    }

    // Create source
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;

    // Apply tune (playback rate)
    const semitones = this.params.tune;
    source.playbackRate.value = Math.pow(2, semitones / 12);

    // Create envelope gain
    const envelope = this.context.createGain();

    // Calculate times
    const attackTime = this.params.attack * 1; // Max 1 second attack
    const sampleDuration = this.buffer.duration / source.playbackRate.value;
    const decayDuration = sampleDuration * this.params.decay;
    const totalDuration = attackTime + decayDuration;

    // Apply level and velocity
    const targetGain = this.params.level * velocity;

    // Envelope shape
    envelope.gain.setValueAtTime(0, when);

    if (attackTime > 0.001) {
      // Attack phase
      envelope.gain.linearRampToValueAtTime(targetGain, when + attackTime);
    } else {
      // Instant attack
      envelope.gain.setValueAtTime(targetGain, when);
    }

    // Decay/release
    if (this.params.decay < 1) {
      // Fade out at decay point
      const fadeStart = when + attackTime + decayDuration * 0.7;
      const fadeEnd = when + attackTime + decayDuration;
      envelope.gain.setValueAtTime(targetGain, fadeStart);
      envelope.gain.exponentialRampToValueAtTime(0.001, fadeEnd);
    }

    // Connect and play: source -> envelope -> filter -> panner -> output
    source.connect(envelope);
    envelope.connect(this.filter);

    source.start(when);

    // Stop at end of decay (or full sample if decay=1)
    if (this.params.decay < 1) {
      source.stop(when + totalDuration + 0.01);
    }

    this.activeSource = source;

    // Clear reference when done
    source.onended = () => {
      if (this.activeSource === source) {
        this.activeSource = null;
      }
    };
  }
}

export default SampleVoice;
