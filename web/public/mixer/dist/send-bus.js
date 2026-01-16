/**
 * SendBus Class
 *
 * A parallel effect bus that multiple channels/voices can send to.
 * Unlike insert effects (which are in series), sends allow parallel processing
 * where the original signal continues to master while a copy goes through the bus.
 *
 * Signal flow:
 *   source ──┬──────────────────────────► master (dry)
 *            │
 *            └──► sendGain ──► [effects] ──► bus output ──► master (wet)
 *
 * Usage:
 *   const reverbBus = new SendBus(context, 'reverb');
 *   await reverbBus.addEffect(new Reverb(context));
 *   reverbBus.output.connect(masterGain);
 *
 *   // Send a voice to the bus
 *   kickVoice.output.connect(reverbBus.createSend(0.3)); // 30% send level
 */

import { Reverb } from './effects/reverb.js';
import { EQ } from './effects/eq.js';
import { Ducker } from './effects/ducker.js';

export class SendBus {
  /**
   * @param {BaseAudioContext} context - AudioContext or OfflineAudioContext
   * @param {string} name - Name of this bus (e.g., 'reverb', 'delay')
   */
  constructor(context, name) {
    this.context = context;
    this.name = name;
    this.effects = [];
    this._sends = new Map(); // Track send gains by source name

    // Input node - receives all sends
    this._input = context.createGain();
    this._input.gain.value = 1;

    // Output node - end of effects chain, connects to master
    this._output = context.createGain();
    this._output.gain.value = 1;

    // Start with input connected directly to output (no effects)
    this._input.connect(this._output);
  }

  /**
   * Input node - connect effect chain start here
   */
  get input() {
    return this._input;
  }

  /**
   * Output node - connect to master or another bus
   */
  get output() {
    return this._output;
  }

  /**
   * Create a send gain node for a source to connect to this bus
   * @param {number} level - Send level (0-1)
   * @param {string} [sourceName] - Optional name to track this send
   * @returns {GainNode} The send gain node to connect source to
   */
  createSend(level = 0.5, sourceName = null) {
    const sendGain = this.context.createGain();
    sendGain.gain.value = Math.max(0, Math.min(1, level));
    sendGain.connect(this._input);

    if (sourceName) {
      this._sends.set(sourceName, sendGain);
    }

    return sendGain;
  }

  /**
   * Get an existing send by source name
   * @param {string} sourceName - Name of the source
   * @returns {GainNode|null}
   */
  getSend(sourceName) {
    return this._sends.get(sourceName) || null;
  }

  /**
   * Set send level for a named source
   * @param {string} sourceName - Name of the source
   * @param {number} level - Send level (0-1)
   */
  setSendLevel(sourceName, level) {
    const send = this._sends.get(sourceName);
    if (send) {
      send.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  /**
   * Add an effect to the bus chain
   * Effects are processed in order they're added
   * @param {Effect} effect - Effect instance (EQ, Reverb, etc.)
   */
  addEffect(effect) {
    // Disconnect current chain end from output
    if (this.effects.length === 0) {
      this._input.disconnect();
      this._input.connect(effect.input);
    } else {
      const lastEffect = this.effects[this.effects.length - 1];
      lastEffect.output.disconnect();
      lastEffect.output.connect(effect.input);
    }

    // Connect new effect to output
    effect.output.connect(this._output);
    this.effects.push(effect);

    return effect;
  }

  /**
   * Create and add an effect by type
   * @param {string} type - Effect type ('reverb', 'eq', 'ducker')
   * @param {Object} options - Effect options (preset, parameters)
   * @returns {Promise<Effect>} The created effect
   */
  async createEffect(type, options = {}) {
    let effect;

    switch (type.toLowerCase()) {
      case 'reverb':
        effect = new Reverb(this.context);
        await effect.init();
        if (options.preset) effect.setPreset(options.preset);
        if (options.mix !== undefined) effect.setParameter('mix', options.mix);
        break;

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
        if (options.attack !== undefined) effect.setParameter('attack', options.attack);
        if (options.release !== undefined) effect.setParameter('release', options.release);
        if (options.trigger) effect.setTrigger(options.trigger);
        break;

      default:
        throw new Error(`SendBus: unknown effect type "${type}"`);
    }

    this.addEffect(effect);
    return effect;
  }

  /**
   * Get all effects on this bus
   * @returns {Effect[]}
   */
  getEffects() {
    return [...this.effects];
  }

  /**
   * Get bus volume
   */
  get volume() {
    return this._output.gain.value;
  }

  /**
   * Set bus volume
   */
  set volume(value) {
    this._output.gain.value = Math.max(0, Math.min(2, value));
  }

  /**
   * Serialize bus state for manifest
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
        [...this._sends.entries()].map(([name, gain]) => [name, gain.gain.value])
      ),
    };
  }

  /**
   * Clean up
   */
  dispose() {
    this.effects.forEach(e => e.dispose?.());
    this._input.disconnect();
    this._output.disconnect();
    this._sends.forEach(g => g.disconnect());
    this._sends.clear();
  }
}

export default SendBus;
