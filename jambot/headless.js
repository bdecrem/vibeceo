/**
 * Jambot Headless API
 *
 * Drive Jambot's tool layer programmatically — no Claude agent loop, no TUI.
 * Persistent session state between calls. Producer-friendly units throughout.
 *
 * Usage:
 *   import { JambotHeadless } from './headless.js';
 *   const jb = new JambotHeadless({ bpm: 128 });
 *   await jb.tool('add_jb01', { kick: [0, 4, 8, 12], ch: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] });
 *   await jb.tool('tweak', { path: 'jb01.kick.decay', value: 75 });
 *   await jb.render('my-beat', 4);
 */

import { createSession, serializeSession, deserializeSession } from './core/session.js';
import { renderSession } from './core/render.js';
import { executeTool, getToolNames, initializeTools } from './tools/index.js';

export class JambotHeadless {
  /**
   * @param {Object} config - Session config
   * @param {number} [config.bpm=128] - Tempo
   * @param {number} [config.swing=0] - Swing amount (0-100)
   * @param {number} [config.bars=2] - Default render length
   * @param {number} [config.sampleRate=44100] - Sample rate
   * @param {string} [config.outputDir='.'] - Default output directory for renders
   */
  constructor(config = {}) {
    this.session = createSession(config);
    this.outputDir = config.outputDir || '.';
    this._initialized = false;
  }

  /**
   * Execute any Jambot tool by name.
   * All values use producer-friendly units (dB, 0-100, Hz, semitones).
   *
   * @param {string} name - Tool name (e.g., 'add_jb01', 'tweak', 'automate')
   * @param {Object} input - Tool parameters
   * @returns {Promise<string>} Tool result message
   */
  async tool(name, input = {}) {
    if (!this._initialized) {
      await initializeTools();
      this._initialized = true;
    }

    const context = {
      renderSession,
      renderPath: undefined,
    };

    // For render tool, resolve the output path
    if (name === 'render' && input.filename) {
      const filename = input.filename.endsWith('.wav') ? input.filename : `${input.filename}.wav`;
      context.renderPath = filename.includes('/') ? filename : `${this.outputDir}/${filename}`;
    }

    return executeTool(name, input, this.session, context);
  }

  /**
   * Render current session to WAV.
   *
   * @param {string} filename - Output filename (with or without .wav)
   * @param {number} [bars] - Number of bars (default: session.bars)
   * @returns {Promise<string>} Render result message
   */
  async render(filename, bars) {
    return this.tool('render', {
      filename,
      bars: bars || this.session.bars,
    });
  }

  /**
   * List all available tool names.
   * @returns {Promise<string[]>}
   */
  async listTools() {
    if (!this._initialized) {
      await initializeTools();
      this._initialized = true;
    }
    return getToolNames();
  }

  /**
   * Get/set BPM.
   * @param {number} [bpm] - If provided, sets BPM. Always returns current BPM.
   * @returns {number}
   */
  bpm(bpm) {
    if (bpm !== undefined) this.session.bpm = bpm;
    return this.session.bpm;
  }

  /**
   * Get/set swing.
   * @param {number} [swing] - If provided, sets swing (0-100). Always returns current.
   * @returns {number}
   */
  swing(swing) {
    if (swing !== undefined) this.session.swing = swing;
    return this.session.swing;
  }

  /**
   * Serialize session state (for saving/restoring).
   * @returns {Object}
   */
  save() {
    return serializeSession(this.session);
  }

  /**
   * Restore session from serialized state.
   * @param {Object} data - Previously serialized session
   */
  load(data) {
    this.session = deserializeSession(data);
  }
}

/**
 * Quick-start factory: create a headless instance and ensure tools are loaded.
 *
 * @param {Object} config - Same as JambotHeadless constructor
 * @returns {Promise<JambotHeadless>}
 */
export async function createHeadless(config = {}) {
  const jb = new JambotHeadless(config);
  await initializeTools();
  jb._initialized = true;
  return jb;
}
