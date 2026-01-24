/**
 * Sampler Tools (R9DS)
 *
 * Tools for 10-slot sample player: list_kits, load_kit, add_samples, tweak_samples, create_kit
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine } from '../params/converters.js';
import { getAvailableKits, getKitPaths, loadKit } from '../kit-loader.js';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// ffmpeg path (for audio conversion)
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

// Slot IDs
const SAMPLER_SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

const samplerTools = {
  /**
   * List available sample kits (bundled + user)
   */
  list_kits: async (input, session, context) => {
    const kits = getAvailableKits();
    const paths = getKitPaths();
    if (kits.length === 0) {
      return `No kits found.\nBundled: ${paths.bundled}\nUser: ${paths.user}`;
    }
    const kitList = kits.map(k => `  ${k.id} - ${k.name} (${k.source})`).join('\n');
    return `Available kits:\n${kitList}\n\nUser kits folder: ${paths.user}`;
  },

  /**
   * Load a sample kit by ID
   */
  load_kit: async (input, session, context) => {
    try {
      const kit = loadKit(input.kit);
      session.samplerKit = kit;
      // Initialize params for each slot
      for (const slot of kit.slots) {
        if (!session.samplerParams[slot.id]) {
          session.samplerParams[slot.id] = {
            level: 0.5,  // 0dB unity gain (normalized: 0.5 = 0dB, 1.0 = +6dB)
            tune: 0,
            attack: 0,
            decay: 1,
            filter: 1,
            pan: 0
          };
        }
      }
      const slotNames = kit.slots.map(s => `${s.id}:${s.short}`).join(', ');
      return `Loaded kit "${kit.name}"\nSlots: ${slotNames}`;
    } catch (e) {
      return `Error loading kit: ${e.message}`;
    }
  },

  /**
   * Add sample patterns - program hits on steps for each slot
   */
  add_samples: async (input, session, context) => {
    if (!session.samplerKit) {
      return "No kit loaded. Use load_kit first.";
    }

    const added = [];

    for (const slot of SAMPLER_SLOTS) {
      const steps = input[slot] || [];
      if (steps.length > 0) {
        session.samplerPattern[slot] = Array(16).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === 'object';

        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== undefined ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.samplerPattern[slot][step].velocity = vel;
            }
          }
          added.push(`${slot}:${steps.length}`);
        } else {
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.samplerPattern[slot][step].velocity = 1;
            }
          }
          added.push(`${slot}:${steps.length}`);
        }
      }
    }

    // Get slot names from kit for nicer output
    const slotInfo = added.map(a => {
      const slotId = a.split(':')[0];
      const slotMeta = session.samplerKit.slots.find(s => s.id === slotId);
      return slotMeta ? `${slotMeta.short}:${a.split(':')[1]}` : a;
    });

    return `R9DS samples: ${slotInfo.join(', ')}`;
  },

  /**
   * DEPRECATED: Use generic tweak() instead.
   *
   * Examples with generic tweak:
   *   tweak({ path: 'sampler.s1.level', value: -6 })   → -6dB
   *   tweak({ path: 'sampler.s1.tune', value: +3 })    → +3 semitones
   *   tweak({ path: 'sampler.s2.filter', value: 2000 }) → 2000Hz
   *   tweak({ path: 'sampler.s3.pan', value: -50 })    → L50
   *
   * This tool still works but is no longer the recommended approach.
   * The generic tweak() handles unit conversion automatically.
   *
   * @deprecated
   */
  tweak_samples: async (input, session, context) => {
    const slot = input.slot;
    if (!session.samplerParams[slot]) {
      session.samplerParams[slot] = { level: 0.5, tune: 0, attack: 0, decay: 1, filter: 1, pan: 0 };  // 0.5 = 0dB unity
    }

    const tweaks = [];

    // Mute: convenience alias for level=-60dB, Unmute: restore to 0dB
    if (input.mute === true) {
      const def = getParamDef('r9ds', slot, 'level');
      session.samplerParams[slot].level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    } else if (input.mute === false) {
      const def = getParamDef('r9ds', slot, 'level');
      session.samplerParams[slot].level = def ? toEngine(0, def) : 0.5;  // 0dB = unity (0.5 in sampler scale)
      tweaks.push('unmuted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('r9ds', slot, 'level');
      session.samplerParams[slot].level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones (sampler might want semitones directly)
    if (input.tune !== undefined) {
      // Keep as semitones for sampler engine
      session.samplerParams[slot].tune = input.tune;
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Attack: 0-100 → 0-1
    if (input.attack !== undefined) {
      const def = getParamDef('r9ds', slot, 'attack');
      session.samplerParams[slot].attack = def ? toEngine(input.attack, def) : input.attack / 100;
      tweaks.push(`attack=${input.attack}`);
    }

    // Decay: 0-100 → 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('r9ds', slot, 'decay');
      session.samplerParams[slot].decay = def ? toEngine(input.decay, def) : input.decay / 100;
      tweaks.push(`decay=${input.decay}`);
    }

    // Filter: Hz → 0-1 (log scale)
    if (input.filter !== undefined) {
      const def = getParamDef('r9ds', slot, 'filter');
      session.samplerParams[slot].filter = def ? toEngine(input.filter, def) : input.filter;
      const display = input.filter >= 1000 ? `${(input.filter/1000).toFixed(1)}kHz` : `${input.filter}Hz`;
      tweaks.push(`filter=${display}`);
    }

    // Pan: -100 to +100 → -1 to +1
    if (input.pan !== undefined) {
      const def = getParamDef('r9ds', slot, 'pan');
      session.samplerParams[slot].pan = def ? toEngine(input.pan, def) : input.pan / 100;
      const panDisplay = input.pan === 0 ? 'C' : (input.pan < 0 ? `L${Math.abs(input.pan)}` : `R${input.pan}`);
      tweaks.push(`pan=${panDisplay}`);
    }

    // Get slot name from kit
    const slotMeta = session.samplerKit?.slots.find(s => s.id === slot);
    const slotName = slotMeta ? slotMeta.name : slot;

    return `R9DS ${slotName}: ${tweaks.join(', ')}`;
  },

  /**
   * Show current sampler state (loaded kit, slots, pattern)
   */
  show_sampler: async (input, session, context) => {
    const kit = session.samplerKit;

    if (!kit) {
      return 'R9DS: No kit loaded. Use load_kit to load one.';
    }

    const lines = ['R9DS SAMPLER:', ''];
    lines.push(`Kit: ${kit.name} (${kit.id})`);
    lines.push('');
    lines.push('Slots:');

    for (const slot of kit.slots) {
      const pattern = session.samplerPattern[slot.id] || [];
      const hits = pattern.filter(s => s?.velocity > 0).length;
      const params = session.samplerParams[slot.id] || {};
      const level = params.level !== undefined ? `${params.level}dB` : '0dB';

      let info = `  ${slot.id}: ${slot.name} (${slot.short})`;
      if (hits > 0) info += ` — ${hits} hits`;
      if (params.level !== undefined && params.level !== 0) info += ` @ ${level}`;
      lines.push(info);
    }

    return lines.join('\n');
  },

  /**
   * Create a new kit from a folder of audio files
   */
  create_kit: async (input, session, context) => {
    const { source_folder, kit_id, kit_name, slots } = input;

    // Smart path resolution - try multiple locations
    const resolvePath = (p) => {
      // Already absolute
      if (p.startsWith('/')) return p;
      // Expand ~
      if (p.startsWith('~')) return p.replace('~', homedir());

      // Try common locations for relative paths
      const candidates = [
        p,                                              // As-is (cwd)
        join(homedir(), p),                             // ~/path
        join(homedir(), 'Documents', p),                // ~/Documents/path
        join(homedir(), 'Documents', 'Jambot', p),      // ~/Documents/Jambot/path (default project location)
        join(homedir(), 'Desktop', p),                  // ~/Desktop/path
        join(homedir(), 'Downloads', p),                // ~/Downloads/path
        join(homedir(), 'Music', p),                    // ~/Music/path
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
      }
      return null; // Not found
    };

    const sourcePath = resolvePath(source_folder);

    // Check source folder exists
    if (!sourcePath) {
      return `Error: Folder not found: ${source_folder}\n\nTried:\n- ${source_folder}\n- ~/${source_folder}\n- ~/Documents/${source_folder}\n- ~/Documents/Jambot/${source_folder}\n- ~/Desktop/${source_folder}\n- ~/Downloads/${source_folder}`;
    }

    // Find audio files
    const audioExtensions = ['.wav', '.aiff', '.aif', '.mp3', '.m4a', '.flac'];
    const files = readdirSync(sourcePath).filter(f => {
      const ext = f.toLowerCase().slice(f.lastIndexOf('.'));
      return audioExtensions.includes(ext);
    }).sort();

    if (files.length === 0) {
      return `Error: No audio files found in ${source_folder}. Looking for: ${audioExtensions.join(', ')}`;
    }

    // If no slots provided, return file list for user to name
    if (!slots || slots.length === 0) {
      const fileList = files.slice(0, 10).map((f, i) => `  ${i + 1}. ${f}`).join('\n');
      const extra = files.length > 10 ? `\n  ... and ${files.length - 10} more` : '';
      return `Found ${files.length} audio files in ${source_folder}:\n${fileList}${extra}\n\nAsk the user what to name each sound (or use auto-naming based on filenames). Then call create_kit again with the slots array.`;
    }

    // Validate we have slots
    if (slots.length > 10) {
      return `Error: Maximum 10 slots per kit. You provided ${slots.length}.`;
    }

    // Create kit directory
    const userKitsPath = join(homedir(), 'Documents', 'Jambot', 'kits');
    const kitPath = join(userKitsPath, kit_id);
    const samplesPath = join(kitPath, 'samples');

    if (existsSync(kitPath)) {
      return `Error: Kit "${kit_id}" already exists at ${kitPath}. Choose a different ID or delete the existing kit.`;
    }

    mkdirSync(samplesPath, { recursive: true });

    // Copy files and build kit.json
    const kitSlots = [];
    const copied = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const slotId = `s${i + 1}`;
      const sourceFile = join(sourcePath, slot.file);

      if (!existsSync(sourceFile)) {
        return `Error: File not found: ${slot.file}`;
      }

      const destFile = join(samplesPath, `${slotId}.wav`);
      const ext = slot.file.toLowerCase().slice(slot.file.lastIndexOf('.'));

      // If already WAV, just copy. Otherwise convert with ffmpeg.
      if (ext === '.wav') {
        copyFileSync(sourceFile, destFile);
      } else {
        // Convert to WAV - try afconvert (macOS) first, then ffmpeg
        let converted = false;

        // On macOS, afconvert handles Apple audio formats better
        if (process.platform === 'darwin') {
          try {
            execSync(`afconvert -f WAVE -d LEI16@44100 "${sourceFile}" "${destFile}"`, {
              stdio: 'pipe'
            });
            converted = true;
          } catch {
            // afconvert failed, try ffmpeg
          }
        }

        // Fallback to ffmpeg
        if (!converted) {
          try {
            execSync(`"${ffmpegPath}" -y -i "${sourceFile}" -ar 44100 -ac 2 -sample_fmt s16 "${destFile}"`, {
              stdio: 'pipe'
            });
            converted = true;
          } catch (e) {
            return `Error converting ${slot.file}: Could not convert with afconvert or ffmpeg. Try converting to WAV manually first.`;
          }
        }
      }

      kitSlots.push({
        id: slotId,
        name: slot.name,
        short: slot.short || slot.name.slice(0, 2).toUpperCase()
      });

      copied.push(`${slotId}: ${slot.name} (${slot.file})`);
    }

    // Write kit.json
    const kitJson = {
      name: kit_name,
      slots: kitSlots
    };
    writeFileSync(join(kitPath, 'kit.json'), JSON.stringify(kitJson, null, 2));

    // Auto-load the kit into the session so it's ready to use immediately
    const newKit = loadKit(kit_id);
    session.samplerKit = newKit;
    session.samplerPattern = {};  // Clear any existing pattern
    // Initialize params for each slot
    for (const slot of newKit.slots) {
      session.samplerParams[slot.id] = {
        level: 0.5,  // 0dB unity gain (normalized: 0.5 = 0dB, 1.0 = +6dB)
        tune: 0,
        attack: 0,
        decay: 1,
        filter: 1,
        pan: 0
      };
    }

    const slotSummary = newKit.slots.map(s => `${s.id}: ${s.name} (${s.short})`).join('\n');
    return `Created and loaded kit "${kit_name}" (${kit_id})\n\nSlots ready to use:\n${slotSummary}\n\nUse add_samples to program patterns. Example: add_samples with s1:[0,4,8,12] for kicks on beats.`;
  },
};

registerTools(samplerTools);
