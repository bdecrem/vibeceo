// jambot/sample-voice.js - R9DS sampler voice with full parameter support

export class SampleVoice {
  constructor(id, context) {
    this.id = id;
    this.context = context;
    this.buffer = null;
    this.name = '';
    this.short = '';

    // Parameters with defaults
    this.level = 0.8;
    this.tune = 0;      // semitones (-12 to +12)
    this.attack = 0;    // 0-1 (0 = instant)
    this.decay = 1;     // 0-1 (1 = full sample length)
    this.filter = 1;    // 0-1 (1 = fully open)
    this.pan = 0;       // -1 to +1 (0 = center)

    // Create output chain: filter -> panner -> gain -> output
    this.filterNode = context.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 20000;
    this.filterNode.Q.value = 0.7;

    this.pannerNode = context.createStereoPanner();
    this.pannerNode.pan.value = 0;

    this.gainNode = context.createGain();
    this.gainNode.gain.value = this.level;

    // Chain
    this.filterNode.connect(this.pannerNode);
    this.pannerNode.connect(this.gainNode);

    // Output is the gain node
    this.output = this.gainNode;
  }

  setBuffer(audioBuffer) {
    this.buffer = audioBuffer;
  }

  setMeta(name, short) {
    this.name = name;
    this.short = short;
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  setParameter(id, value) {
    switch (id) {
      case 'level':
        this.level = Math.max(0, Math.min(1, value));
        this.gainNode.gain.value = this.level;
        break;
      case 'tune':
        this.tune = Math.max(-12, Math.min(12, value));
        break;
      case 'attack':
        this.attack = Math.max(0, Math.min(1, value));
        break;
      case 'decay':
        this.decay = Math.max(0.01, Math.min(1, value));
        break;
      case 'filter':
        this.filter = Math.max(0, Math.min(1, value));
        // Map 0-1 to 200Hz - 20kHz (logarithmic)
        const filterFreq = 200 * Math.pow(100, this.filter);
        this.filterNode.frequency.value = filterFreq;
        break;
      case 'pan':
        this.pan = Math.max(-1, Math.min(1, value));
        this.pannerNode.pan.value = this.pan;
        break;
    }
  }

  trigger(time, velocity) {
    if (!this.buffer) return;

    const when = time ?? this.context.currentTime;

    // Create source for this trigger
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;

    // Apply tuning via playback rate
    source.playbackRate.value = Math.pow(2, this.tune / 12);

    // Calculate effective sample duration
    const baseDuration = this.buffer.duration / source.playbackRate.value;
    const effectiveDuration = baseDuration * this.decay;

    // Create per-trigger gain for envelope
    const envGain = this.context.createGain();

    // Apply velocity and level
    const peakLevel = velocity * this.level;

    // Attack envelope
    if (this.attack > 0) {
      const attackTime = this.attack * 0.5; // Max 500ms attack
      envGain.gain.setValueAtTime(0, when);
      envGain.gain.linearRampToValueAtTime(peakLevel, when + attackTime);
    } else {
      envGain.gain.setValueAtTime(peakLevel, when);
    }

    // Decay/fade out at end (short fade to avoid clicks)
    const fadeStart = when + effectiveDuration - 0.01;
    const fadeEnd = when + effectiveDuration;
    envGain.gain.setValueAtTime(peakLevel, fadeStart);
    envGain.gain.linearRampToValueAtTime(0, fadeEnd);

    // Connect: source -> envelope -> filter chain
    source.connect(envGain);
    envGain.connect(this.filterNode);

    // Play
    source.start(when);
    source.stop(when + effectiveDuration + 0.1);
  }
}
