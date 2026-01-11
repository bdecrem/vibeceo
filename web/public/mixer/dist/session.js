/**
 * Session Class
 *
 * Main orchestration for multi-track mixing with effects.
 * Manages shared AudioContext, channels, effects, and combined rendering.
 *
 * Usage:
 *   const session = new Session({ bpm: 128 });
 *
 *   // Add instruments (pass existing controllers or engines)
 *   session.add('drums', new TR909Engine({ context: session.context }));
 *   session.add('bass', new TB303Engine({ context: session.context }));
 *
 *   // Add effects to channels
 *   session.channel('bass').duck({ trigger: session.channel('drums').getVoiceOutput('kick') });
 *   session.channel('bass').eq({ preset: 'acidBass' });
 *
 *   // Master effects
 *   session.master.reverb({ preset: 'plate', mix: 0.15 });
 *
 *   // Play or render
 *   session.play();
 *   const { wav } = await session.render({ bars: 8 });
 */

import { Ducker } from './effects/ducker.js';
import { EQ } from './effects/eq.js';
import { Reverb } from './effects/reverb.js';
import { EffectSend } from './effect-send.js';

/**
 * Channel wrapper for an instrument with effects chain
 */
class Channel {
  constructor(session, name, engine) {
    this.session = session;
    this.name = name;
    this.engine = engine;
    this.context = session.context;
    this.effects = [];

    // Channel gain (for volume control)
    this._gain = this.context.createGain();
    this._gain.gain.value = 1;

    // Output node (end of effects chain)
    this._output = this._gain;

    // Route engine output through our gain to master
    if (engine.masterGain) {
      engine.masterGain.disconnect();
      engine.masterGain.connect(this._gain);
    } else if (engine.output) {
      engine.output.disconnect();
      engine.output.connect(this._gain);
    }

    // Connect to master
    this._gain.connect(session._masterInput);
  }

  /**
   * Get volume (0-1)
   */
  get volume() {
    return this._gain.gain.value;
  }

  /**
   * Set volume (0-1)
   */
  set volume(value) {
    this._gain.gain.value = Math.max(0, Math.min(1, value));
  }

  /**
   * Get output node for this channel's signal (before master)
   * Used for sidechain triggers
   */
  get output() {
    return this._output;
  }

  /**
   * Get a specific voice output (for drums)
   * @param {string} voiceId - Voice ID (e.g., 'kick', 'snare')
   */
  getVoiceOutput(voiceId) {
    const voice = this.engine.voices?.get(voiceId);
    if (voice && voice.output) {
      return voice.output;
    }
    // Fallback to engine's compressor (pre-master)
    if (this.engine.compressor) {
      return this.engine.compressor;
    }
    return this.engine.masterGain || this._gain;
  }

  /**
   * Insert an effect into the chain
   */
  _insertEffect(effect) {
    // Disconnect current chain
    if (this.effects.length === 0) {
      // First effect: insert between engine and gain
      if (this.engine.masterGain) {
        this.engine.masterGain.disconnect();
        this.engine.masterGain.connect(effect.input);
      }
    } else {
      // Chain from previous effect
      const lastEffect = this.effects[this.effects.length - 1];
      lastEffect.output.disconnect();
      lastEffect.output.connect(effect.input);
    }

    // Connect effect to our gain
    effect.output.connect(this._gain);

    this.effects.push(effect);
    return effect;
  }

  /**
   * Add ducker (sidechain)
   * @param {Object} options - { trigger, amount, attack, release, preset }
   */
  duck(options = {}) {
    const ducker = new Ducker(this.context);

    if (options.preset) {
      ducker.setPreset(options.preset);
    }
    if (options.amount !== undefined) {
      ducker.setParameter('amount', options.amount);
    }
    if (options.attack !== undefined) {
      ducker.setParameter('attack', options.attack);
    }
    if (options.release !== undefined) {
      ducker.setParameter('release', options.release);
    }
    if (options.trigger) {
      ducker.setTrigger(options.trigger);
    }

    this._insertEffect(ducker);
    return ducker;
  }

  /**
   * Add EQ
   * @param {Object} options - { preset, ...params }
   */
  eq(options = {}) {
    const eq = new EQ(this.context);

    if (options.preset) {
      eq.setPreset(options.preset);
    }

    // Apply any additional parameters
    Object.entries(options).forEach(([key, value]) => {
      if (key !== 'preset') {
        eq.setParameter(key, value);
      }
    });

    this._insertEffect(eq);
    return eq;
  }

  /**
   * Add reverb (send)
   * Note: Usually reverb goes on master, but can be per-channel
   */
  async reverb(options = {}) {
    const reverb = new Reverb(this.context);
    await reverb.init();

    if (options.preset) {
      reverb.setPreset(options.preset);
    }
    if (options.mix !== undefined) {
      reverb.setParameter('mix', options.mix);
    }

    this._insertEffect(reverb);
    return reverb;
  }

  /**
   * Add an effect with automation support via EffectSend wrapper
   * Returns the EffectSend instance for step-based automation
   *
   * @param {Effect} effect - The effect to add
   * @param {Object} [options] - EffectSend options
   * @param {number} [options.defaultWet=1] - Default wet level (0-1)
   * @param {number} [options.fadeTime=0.005] - Crossfade time in seconds
   * @returns {EffectSend} The send wrapper for automation control
   *
   * @example
   *   const hpf = new EQ(session.context);
   *   hpf.setParameter('highpass', 500);
   *   const send = channel.addSend(hpf, { defaultWet: 0 });
   *   send.setAutomationPattern([0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1]);
   */
  addSend(effect, options = {}) {
    const send = new EffectSend(this.context, {
      effect,
      defaultWet: options.defaultWet,
      fadeTime: options.fadeTime,
    });

    this._insertEffect(send);

    // Track sends separately for automation scheduling
    if (!this._effectSends) {
      this._effectSends = [];
    }
    this._effectSends.push(send);

    return send;
  }

  /**
   * Get all effect sends (for automation scheduling during render)
   * @returns {EffectSend[]}
   */
  getEffectSends() {
    return this._effectSends || [];
  }

  /**
   * Clean up
   */
  dispose() {
    this.effects.forEach(e => e.dispose());
    this._gain.disconnect();
  }
}

/**
 * Master bus with effects chain
 */
class MasterBus {
  constructor(session) {
    this.session = session;
    this.context = session.context;
    this.effects = [];

    // Master gain
    this._gain = this.context.createGain();
    this._gain.gain.value = 0.8;

    // Input node (receives all channels)
    this._input = this.context.createGain();
    this._input.connect(this._gain);

    // Connect to destination
    this._gain.connect(this.context.destination);
  }

  /**
   * Get input node for channels to connect to
   */
  get input() {
    return this._input;
  }

  /**
   * Get volume (0-1)
   */
  get volume() {
    return this._gain.gain.value;
  }

  /**
   * Set volume (0-1)
   */
  set volume(value) {
    this._gain.gain.value = Math.max(0, Math.min(1, value));
  }

  /**
   * Insert effect into master chain
   */
  _insertEffect(effect) {
    if (this.effects.length === 0) {
      // First effect
      this._input.disconnect();
      this._input.connect(effect.input);
    } else {
      const lastEffect = this.effects[this.effects.length - 1];
      lastEffect.output.disconnect();
      lastEffect.output.connect(effect.input);
    }

    effect.output.connect(this._gain);
    this.effects.push(effect);
    return effect;
  }

  /**
   * Add EQ
   */
  eq(options = {}) {
    const eq = new EQ(this.context);

    if (options.preset) {
      eq.setPreset(options.preset);
    }
    Object.entries(options).forEach(([key, value]) => {
      if (key !== 'preset') {
        eq.setParameter(key, value);
      }
    });

    this._insertEffect(eq);
    return eq;
  }

  /**
   * Add reverb
   */
  async reverb(options = {}) {
    const reverb = new Reverb(this.context);
    await reverb.init();

    if (options.preset) {
      reverb.setPreset(options.preset);
    }
    if (options.mix !== undefined) {
      reverb.setParameter('mix', options.mix);
    }

    this._insertEffect(reverb);
    return reverb;
  }

  /**
   * Clean up
   */
  dispose() {
    this.effects.forEach(e => e.dispose());
    this._gain.disconnect();
    this._input.disconnect();
  }
}

/**
 * Session - main orchestration class
 */
export class Session {
  constructor(options = {}) {
    this.context = options.context ?? new AudioContext();
    this._bpm = options.bpm ?? 120;
    this._channels = new Map();

    // Master bus
    this.master = new MasterBus(this);
    this._masterInput = this.master.input;
  }

  /**
   * Get/set BPM
   */
  get bpm() {
    return this._bpm;
  }

  set bpm(value) {
    this._bpm = value;
    // Update all instruments
    this._channels.forEach((channel) => {
      if (channel.engine.setBpm) {
        channel.engine.setBpm(value);
      } else if (channel.engine.sequencer?.setBpm) {
        channel.engine.sequencer.setBpm(value);
      }
    });
  }

  /**
   * Add an instrument engine
   * @param {string} name - Channel name
   * @param {Object} engine - Synth engine instance (TR909Engine, TB303Engine, etc.)
   */
  add(name, engine) {
    if (this._channels.has(name)) {
      console.warn(`Session: channel "${name}" already exists, replacing`);
      this._channels.get(name).dispose();
    }

    // Set BPM on engine
    if (engine.setBpm) {
      engine.setBpm(this._bpm);
    } else if (engine.sequencer?.setBpm) {
      engine.sequencer.setBpm(this._bpm);
    }

    const channel = new Channel(this, name, engine);
    this._channels.set(name, channel);
    return channel;
  }

  /**
   * Get a channel by name
   * @param {string} name - Channel name
   */
  channel(name) {
    const ch = this._channels.get(name);
    if (!ch) {
      throw new Error(`Session: unknown channel "${name}"`);
    }
    return ch;
  }

  /**
   * Get all channel names
   */
  getChannels() {
    return [...this._channels.keys()];
  }

  /**
   * Start playback on all instruments
   */
  async play() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this._channels.forEach((channel) => {
      if (channel.engine.startSequencer) {
        channel.engine.startSequencer();
      } else if (channel.engine.sequencer?.start) {
        channel.engine.sequencer.start();
      }
    });
  }

  /**
   * Stop playback on all instruments
   */
  stop() {
    this._channels.forEach((channel) => {
      if (channel.engine.stopSequencer) {
        channel.engine.stopSequencer();
      } else if (channel.engine.sequencer?.stop) {
        channel.engine.sequencer.stop();
      }
    });
  }

  /**
   * Check if playing
   */
  isPlaying() {
    for (const channel of this._channels.values()) {
      if (channel.engine.sequencer?.isRunning?.()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Render all channels to a single WAV
   * @param {Object} options - { bars, sampleRate, title }
   * @returns {Promise<{buffer: AudioBuffer, wav: ArrayBuffer, manifest: Object}>}
   */
  async render(options = {}) {
    const bars = options.bars ?? 1;
    const sampleRate = options.sampleRate ?? 44100;
    const title = options.title ?? `track-${Date.now()}`;

    // Calculate duration based on BPM
    // 4 beats per bar, duration = (bars * 4 * 60) / bpm
    const duration = (bars * 4 * 60) / this._bpm;

    // Create offline context
    const offlineContext = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

    // For each channel, render separately then mix
    const channelBuffers = [];

    for (const [name, channel] of this._channels) {
      const engine = channel.engine;
      let buffer = null;

      // Check if engine supports offline rendering
      if (engine.renderPattern) {
        // Use engine's render method (TB303, SH101)
        buffer = await engine.renderPattern({ bars, bpm: this._bpm });
      } else if (engine.renderToBuffer) {
        // Generic render method
        buffer = await engine.renderToBuffer({ duration, sampleRate });
      } else {
        console.warn(`Session: channel "${name}" does not support offline rendering`);
      }

      // Apply effects offline
      if (buffer) {
        // EQ
        const eqEffect = channel.effects?.find(e => e.constructor.name === 'EQ');
        if (eqEffect) {
          buffer = await this._applyEqOffline(buffer, eqEffect, sampleRate);
        }

        // Reverb
        const reverbEffect = channel.effects?.find(e => e.constructor.name === 'Reverb');
        if (reverbEffect) {
          buffer = await this._applyReverbOffline(buffer, reverbEffect, sampleRate);
        }

        channelBuffers.push({ name, buffer, volume: channel.volume });
      }
    }

    // Mix all buffers together
    const mixedBuffer = this._mixBuffers(offlineContext, channelBuffers, duration, sampleRate);

    // Convert to WAV
    const wav = this._audioBufferToWav(mixedBuffer);

    // Build manifest
    const manifest = this._buildManifest(title, bars, channelBuffers);

    return { buffer: mixedBuffer, wav, manifest };
  }

  /**
   * Build a track manifest with all the recipe information
   * @private
   */
  _buildManifest(title, bars, channelBuffers) {
    const manifest = {
      format: 'synthmachine-track',
      version: 1,
      title,
      createdAt: new Date().toISOString(),
      bpm: this._bpm,
      bars,
      duration: (bars * 4 * 60) / this._bpm,
      instruments: {},
      effects: {},
      master: {
        volume: this.master.volume,
        effects: this.master.effects.map(e => this._serializeEffect(e))
      },
      files: {
        mix: `${title}.wav`
      }
    };

    // Serialize each channel
    for (const [name, channel] of this._channels) {
      const engine = channel.engine;

      // Determine instrument type
      let type = 'unknown';
      if (engine.constructor.name.includes('909') || engine.constructor.name === 'TR909Engine') {
        type = '909';
      } else if (engine.constructor.name.includes('303') || engine.constructor.name === 'TB303Engine') {
        type = '303';
      } else if (engine.constructor.name.includes('101') || engine.constructor.name === 'SH101Engine') {
        type = '101';
      }

      manifest.instruments[name] = {
        type,
        volume: channel.volume,
        pattern: this._getEnginePattern(engine, type),
        parameters: this._getEngineParameters(engine, type)
      };

      // Serialize channel effects
      if (channel.effects.length > 0) {
        manifest.effects[name] = channel.effects.map(e => this._serializeEffect(e));
      }
    }

    return manifest;
  }

  /**
   * Get pattern from engine based on type
   * @private
   */
  _getEnginePattern(engine, type) {
    try {
      if (type === '909' && engine.getPattern) {
        // TR909 stores patterns differently
        const patternId = 'web-ui';
        return engine.patterns?.get(patternId) ?? null;
      } else if (engine.getPattern) {
        return engine.getPattern();
      }
    } catch (err) {
      console.warn('Failed to get engine pattern:', err);
    }
    return null;
  }

  /**
   * Get parameters from engine based on type
   * @private
   */
  _getEngineParameters(engine, type) {
    try {
      if (type === '303' && engine.getParameters) {
        return {
          ...engine.getParameters(),
          waveform: engine.getWaveform?.() ?? 'sawtooth',
          engineType: engine.getEngine?.() ?? 'E1'
        };
      } else if (engine.getParameters) {
        return engine.getParameters();
      }
    } catch (err) {
      console.warn('Failed to get engine parameters:', err);
    }
    return {};
  }

  /**
   * Serialize an effect for the manifest
   * @private
   */
  _serializeEffect(effect) {
    const serialized = {
      type: effect.constructor.name.toLowerCase().replace('effect', '')
    };

    // Add effect-specific parameters
    if (effect.getParameters) {
      serialized.parameters = effect.getParameters();
    } else if (effect._parameters) {
      serialized.parameters = { ...effect._parameters };
    }

    // Add preset if available
    if (effect._preset) {
      serialized.preset = effect._preset;
    }

    return serialized;
  }

  /**
   * Generate a plate reverb IR at a specific sample rate
   * @private
   */
  _generatePlateIR(context, sampleRate) {
    const duration = 0.8; // 800ms
    const length = Math.floor(sampleRate * duration);
    const buffer = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-3 * t / duration);
        const noise = (Math.random() * 2 - 1);
        let early = 0;
        if (i < sampleRate * 0.05) {
          const earlyIdx = Math.floor(i / (sampleRate * 0.01));
          if (earlyIdx < 5 && i % Math.floor(sampleRate * 0.01) < 10) {
            early = (Math.random() * 2 - 1) * 0.3;
          }
        }
        const stereoOffset = channel === 0 ? 1 : 0.95;
        data[i] = (noise * decay + early) * 0.5 * stereoOffset;
      }
    }
    return buffer;
  }

  /**
   * Apply Reverb to a buffer offline using OfflineAudioContext
   * @private
   */
  async _applyReverbOffline(buffer, reverbEffect, sampleRate) {
    // Use the buffer's actual sample rate to avoid mismatch errors
    const bufferSampleRate = buffer.sampleRate;
    const numChannels = buffer.numberOfChannels;

    // Reverb adds tail, so extend the buffer
    const duration = 0.8; // Match IR duration
    const tailSamples = Math.floor(bufferSampleRate * duration);
    const length = buffer.length + tailSamples;
    const offlineCtx = new OfflineAudioContext(numChannels, length, bufferSampleRate);

    // Get reverb parameters
    const mix = reverbEffect._mix ?? 0.2;

    // Generate IR at the correct sample rate (avoids mismatch on mobile)
    const irBuffer = this._generatePlateIR(offlineCtx, bufferSampleRate);

    // Create convolver
    const convolver = offlineCtx.createConvolver();
    convolver.buffer = irBuffer;

    // Dry/wet gains
    const dryGain = offlineCtx.createGain();
    const wetGain = offlineCtx.createGain();
    dryGain.gain.value = 1 - mix;
    wetGain.gain.value = mix;

    // Source
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    // Wire: source -> dry -> destination
    //       source -> convolver -> wet -> destination
    source.connect(dryGain);
    dryGain.connect(offlineCtx.destination);

    source.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  }

  /**
   * Apply EQ to a buffer offline using OfflineAudioContext
   * @private
   */
  async _applyEqOffline(buffer, eqEffect, sampleRate) {
    // Use the buffer's actual sample rate to avoid mismatch errors
    const bufferSampleRate = buffer.sampleRate;
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const offlineCtx = new OfflineAudioContext(numChannels, length, bufferSampleRate);

    // Get EQ parameters
    const params = eqEffect.getParameters();

    // Create filter chain
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = params.highpass;
    highpass.Q.value = 0.707;

    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = params.lowpass;
    lowpass.Q.value = 0.707;

    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = params.lowFreq;
    lowShelf.gain.value = params.lowGain;

    const peaking = offlineCtx.createBiquadFilter();
    peaking.type = 'peaking';
    peaking.frequency.value = params.midFreq;
    peaking.Q.value = params.midQ;
    peaking.gain.value = params.midGain;

    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = params.highFreq;
    highShelf.gain.value = params.highGain;

    // Create source from buffer
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    // Wire: source -> HP -> LP -> LS -> Peak -> HS -> destination
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(lowShelf);
    lowShelf.connect(peaking);
    peaking.connect(highShelf);
    highShelf.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  }

  /**
   * Mix multiple audio buffers into one, applying offline sidechain and EQ
   */
  _mixBuffers(context, channelBuffers, duration, sampleRate) {
    const length = Math.floor(duration * sampleRate);
    const outputBuffer = new AudioBuffer({
      length,
      numberOfChannels: 2,
      sampleRate,
    });

    const leftOut = outputBuffer.getChannelData(0);
    const rightOut = outputBuffer.getChannelData(1);

    // Build buffer lookup by channel name
    const buffersByName = new Map();
    for (const { name, buffer, volume } of channelBuffers) {
      buffersByName.set(name, { buffer, volume });
    }

    // Process each channel
    for (const { name, buffer, volume } of channelBuffers) {
      if (!buffer) continue;

      const leftIn = buffer.getChannelData(0);
      const rightIn = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftIn;
      const copyLength = Math.min(length, buffer.length);

      // Check if this channel has a ducker effect
      const channel = this._channels.get(name);
      const ducker = channel?.effects?.find(e => e.constructor.name === 'Ducker');

      if (ducker && ducker._triggerSource) {
        // Apply offline sidechain
        const triggerChannelName = this._findTriggerChannelName(ducker._triggerSource);
        const triggerData = buffersByName.get(triggerChannelName);

        if (triggerData?.buffer) {
          const triggerLeft = triggerData.buffer.getChannelData(0);
          const amount = ducker._amount ?? 0.5;
          const attackMs = ducker._attack ?? 5;
          const releaseMs = ducker._release ?? 150;

          // Convert ms to samples
          const attackSamples = Math.max(1, (attackMs / 1000) * sampleRate);
          const releaseSamples = Math.max(1, (releaseMs / 1000) * sampleRate);

          // Envelope follower state
          let envelope = 0;
          const threshold = 0.05;

          for (let i = 0; i < copyLength; i++) {
            const triggerLevel = Math.abs(triggerLeft[i] || 0);

            // Simple envelope follower
            if (triggerLevel > envelope) {
              envelope += (triggerLevel - envelope) / attackSamples;
            } else {
              envelope += (triggerLevel - envelope) / releaseSamples;
            }

            // Calculate gain reduction
            let gainReduction = 1;
            if (envelope > threshold) {
              gainReduction = 1 - (amount * Math.min(1, envelope / 0.5));
            }

            leftOut[i] += leftIn[i] * volume * gainReduction;
            rightOut[i] += rightIn[i] * volume * gainReduction;
          }
        } else {
          // No trigger buffer found, mix without ducking
          for (let i = 0; i < copyLength; i++) {
            leftOut[i] += leftIn[i] * volume;
            rightOut[i] += rightIn[i] * volume;
          }
        }
      } else {
        // No ducker, simple mix
        for (let i = 0; i < copyLength; i++) {
          leftOut[i] += leftIn[i] * volume;
          rightOut[i] += rightIn[i] * volume;
        }
      }
    }

    // Apply master volume
    const masterVol = this.master.volume;
    for (let i = 0; i < length; i++) {
      leftOut[i] *= masterVol;
      rightOut[i] *= masterVol;
    }

    return outputBuffer;
  }

  /**
   * Find which channel a trigger source belongs to
   */
  _findTriggerChannelName(triggerSource) {
    for (const [name, channel] of this._channels) {
      if (channel._gain === triggerSource || channel._output === triggerSource) {
        return name;
      }
      if (channel.engine.masterGain === triggerSource ||
          channel.engine.output === triggerSource ||
          channel.engine.compressor === triggerSource) {
        return name;
      }
      if (channel.engine.voices) {
        for (const voice of channel.engine.voices.values()) {
          if (voice.output === triggerSource) {
            return name;
          }
        }
      }
    }
    return null;
  }

  /**
   * Convert AudioBuffer to WAV ArrayBuffer
   */
  _audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Interleave channels and write samples
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        // Clamp
        sample = Math.max(-1, Math.min(1, sample));
        // Convert to 16-bit
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  /**
   * Clean up
   */
  dispose() {
    this.stop();
    this._channels.forEach(ch => ch.dispose());
    this.master.dispose();
    if (this.context.state !== 'closed') {
      this.context.close();
    }
  }
}

export { EffectSend };
export default Session;
