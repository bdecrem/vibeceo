/**
 * VoiceChannel Class
 *
 * Routes an individual voice (e.g., kick from 909) through its own signal path.
 * Allows per-voice effects, volume control, and sends independent of other voices.
 *
 * Signal flow:
 *   voice.output ──► VoiceChannel ──┬──► [insert effects] ──► output ──► master
 *                                   │
 *                                   └──► send gains ──► send buses
 *
 * Usage:
 *   const kickChannel = new VoiceChannel(context, drums.voices.get('kick'), 'kick');
 *   kickChannel.addEffect(new EQ(context));
 *   kickChannel.sendTo(reverbBus, 0.2);
 *   kickChannel.output.connect(masterGain);
 */

import { EQ } from './effects/eq.js';
import { Ducker } from './effects/ducker.js';
import { Reverb } from './effects/reverb.js';

export class VoiceChannel {
  /**
   * @param {BaseAudioContext} context - AudioContext or OfflineAudioContext
   * @param {Voice} voice - The synth voice (has .output property)
   * @param {string} name - Channel name (e.g., 'kick', 'bass')
   * @param {Object} [options] - Options
   * @param {boolean} [options.disconnectFromParent=true] - Disconnect voice from its parent engine
   */
  constructor(context, voice, name, options = {}) {
    this.context = context;
    this.voice = voice;
    this.name = name;
    this.effects = [];
    this._sends = new Map(); // SendBus name -> { bus, gain }

    // Input gain (receives voice output)
    this._input = context.createGain();
    this._input.gain.value = 1;

    // Channel volume
    this._volume = context.createGain();
    this._volume.gain.value = 1;

    // Output (end of chain, before sends split off)
    this._output = context.createGain();
    this._output.gain.value = 1;

    // Pre-fader send point (before volume)
    this._preFader = context.createGain();
    this._preFader.gain.value = 1;

    // Post-fader send point (after volume)
    this._postFader = context.createGain();
    this._postFader.gain.value = 1;

    // Default routing: input -> volume -> output
    // (effects get inserted between input and volume)
    this._input.connect(this._preFader);
    this._preFader.connect(this._volume);
    this._volume.connect(this._postFader);
    this._postFader.connect(this._output);

    // Connect voice to our input
    if (options.disconnectFromParent !== false && voice.output) {
      // Disconnect from parent (engine's compressor/master)
      try {
        voice.output.disconnect();
      } catch (e) {
        // May already be disconnected
      }
    }

    if (voice.output) {
      voice.output.connect(this._input);
    }
  }

  /**
   * Output node - connect to master or another destination
   */
  get output() {
    return this._output;
  }

  /**
   * Get/set channel volume (0-1)
   */
  get volume() {
    return this._volume.gain.value;
  }

  set volume(value) {
    this._volume.gain.value = Math.max(0, Math.min(2, value));
  }

  /**
   * Get the voice's raw output (for sidechain triggers)
   */
  get voiceOutput() {
    return this.voice.output;
  }

  /**
   * Insert an effect into the channel
   * Effects go between input and volume (pre-fader)
   * @param {Effect} effect - Effect instance
   */
  addEffect(effect) {
    if (this.effects.length === 0) {
      // First effect: insert between input and preFader
      this._input.disconnect();
      this._input.connect(effect.input);
      effect.output.connect(this._preFader);
    } else {
      // Chain from previous effect
      const lastEffect = this.effects[this.effects.length - 1];
      lastEffect.output.disconnect();
      lastEffect.output.connect(effect.input);
      effect.output.connect(this._preFader);
    }

    this.effects.push(effect);
    return effect;
  }

  /**
   * Create and add an effect by type
   * @param {string} type - Effect type ('eq', 'ducker', 'reverb')
   * @param {Object} options - Effect options
   * @returns {Promise<Effect>}
   */
  async createEffect(type, options = {}) {
    let effect;

    switch (type.toLowerCase()) {
      case 'eq':
        effect = new EQ(this.context);
        if (options.preset) effect.setPreset(options.preset);
        Object.entries(options).forEach(([key, value]) => {
          if (key !== 'preset') effect.setParameter(key, value);
        });
        break;

      case 'ducker':
        effect = new Ducker(this.context);
        if (options.preset) effect.setPreset(options.preset);
        if (options.amount !== undefined) effect.setParameter('amount', options.amount);
        if (options.trigger) effect.setTrigger(options.trigger);
        break;

      case 'reverb':
        effect = new Reverb(this.context);
        await effect.init();
        if (options.preset) effect.setPreset(options.preset);
        if (options.mix !== undefined) effect.setParameter('mix', options.mix);
        break;

      default:
        throw new Error(`VoiceChannel: unknown effect type "${type}"`);
    }

    this.addEffect(effect);
    return effect;
  }

  /**
   * Send to a bus
   * @param {SendBus} bus - The send bus
   * @param {number} level - Send level (0-1)
   * @param {Object} [options] - Options
   * @param {boolean} [options.preFader=false] - Send before volume control
   */
  sendTo(bus, level = 0.5, options = {}) {
    const preFader = options.preFader ?? false;
    const sourcePoint = preFader ? this._preFader : this._postFader;

    // Create send gain
    const sendGain = bus.createSend(level, this.name);

    // Connect from appropriate point
    sourcePoint.connect(sendGain);

    // Track for later adjustment
    this._sends.set(bus.name, { bus, gain: sendGain, preFader });

    return sendGain;
  }

  /**
   * Get send level to a bus
   * @param {string} busName - Bus name
   * @returns {number|null}
   */
  getSendLevel(busName) {
    const send = this._sends.get(busName);
    return send ? send.gain.gain.value : null;
  }

  /**
   * Set send level to a bus
   * @param {string} busName - Bus name
   * @param {number} level - Send level (0-1)
   */
  setSendLevel(busName, level) {
    const send = this._sends.get(busName);
    if (send) {
      send.gain.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  /**
   * Remove send to a bus
   * @param {string} busName - Bus name
   */
  removeSend(busName) {
    const send = this._sends.get(busName);
    if (send) {
      send.gain.disconnect();
      this._sends.delete(busName);
    }
  }

  /**
   * Trigger the voice (passthrough)
   */
  trigger(time, velocity) {
    if (this.voice.trigger) {
      this.voice.trigger(time, velocity);
    }
  }

  /**
   * Set a voice parameter (passthrough)
   */
  setVoiceParameter(paramId, value) {
    if (this.voice.setParameter) {
      this.voice.setParameter(paramId, value);
    } else if (this.voice[paramId] !== undefined) {
      this.voice[paramId] = value;
    }
  }

  /**
   * Get voice parameter descriptors (passthrough)
   */
  get parameterDescriptors() {
    return this.voice.parameterDescriptors || [];
  }

  /**
   * Serialize channel state
   */
  serialize() {
    return {
      name: this.name,
      volume: this.volume,
      effects: this.effects.map(e => ({
        type: e.constructor.name.toLowerCase(),
        parameters: e.getParameters?.() || {},
      })),
      sends: Object.fromEntries(
        [...this._sends.entries()].map(([busName, { gain, preFader }]) => [
          busName,
          { level: gain.gain.value, preFader },
        ])
      ),
    };
  }

  /**
   * Clean up
   */
  dispose() {
    this.effects.forEach(e => e.dispose?.());
    this._sends.forEach(({ gain }) => gain.disconnect());
    this._sends.clear();
    this._input.disconnect();
    this._volume.disconnect();
    this._preFader.disconnect();
    this._postFader.disconnect();
    this._output.disconnect();
  }
}

export default VoiceChannel;
