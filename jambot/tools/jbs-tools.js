/**
 * JB-S Tools (10-slot Sample Player)
 *
 * Tools: list_jbs_kits, load_jbs_kit, add_jbs, tweak_jbs, show_jbs, create_jbs_kit
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
const JBS_SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

const jbsTools = {
  /**
   * List available sample kits (bundled + user)
   */
  list_jbs_kits: async (input, session, context) => {
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
   * Does NOT re-initialize params — the node's _registerParams() already
   * sets defaults from jbs-params.json. Just load the kit.
   */
  load_jbs_kit: async (input, session, context) => {
    try {
      const kit = loadKit(input.kit);
      session.jbsKit = kit;
      const slotNames = kit.slots.map(s => `${s.id}:${s.short}`).join(', ');
      return `Loaded kit "${kit.name}"\nSlots: ${slotNames}`;
    } catch (e) {
      return `Error loading kit: ${e.message}`;
    }
  },

  /**
   * Add sample patterns - program hits on steps for each slot.
   * Supports `bars` for multi-bar patterns.
   */
  add_jbs: async (input, session, context) => {
    if (!session.jbsKit) {
      return "No kit loaded. Use load_jbs_kit first.";
    }

    const bars = input.bars || 1;
    const totalSteps = bars * 16;
    const added = [];

    for (const slot of JBS_SLOTS) {
      const steps = input[slot] || [];
      if (steps.length > 0) {
        session.jbsPattern[slot] = Array(totalSteps).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === 'object';

        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== undefined ? hit.vel : 1;
            if (step >= 0 && step < totalSteps) {
              session.jbsPattern[slot][step].velocity = vel;
            }
          }
          added.push(`${slot}:${steps.length}`);
        } else {
          for (const step of steps) {
            if (step >= 0 && step < totalSteps) {
              session.jbsPattern[slot][step].velocity = 1;
            }
          }
          added.push(`${slot}:${steps.length}`);
        }
      }
    }

    // Get slot names from kit for nicer output
    const slotInfo = added.map(a => {
      const slotId = a.split(':')[0];
      const slotMeta = session.jbsKit.slots.find(s => s.id === slotId);
      return slotMeta ? `${slotMeta.short}:${a.split(':')[1]}` : a;
    });

    const barsMsg = bars > 1 ? ` (${bars} bars)` : '';
    return `JB-S pattern${barsMsg}: ${slotInfo.join(', ')}`;
  },

  /**
   * DEPRECATED: Use generic tweak() instead.
   *
   * Examples with generic tweak:
   *   tweak({ path: 'jbs.s1.level', value: -6 })   → -6dB
   *   tweak({ path: 'jbs.s1.tune', value: +3 })    → +3 semitones
   *   tweak({ path: 'jbs.s2.filter', value: 2000 }) → 2000Hz
   *   tweak({ path: 'jbs.s3.pan', value: -50 })    → L50
   *
   * @deprecated
   */
  tweak_jbs: async (input, session, context) => {
    const slot = input.slot;

    const tweaks = [];

    // Mute: convenience alias for level=-60dB, Unmute: restore to 0dB
    if (input.mute === true) {
      const def = getParamDef('jbs', slot, 'level');
      session.jbsParams[slot] = { ...session.jbsParams[slot], level: def ? toEngine(-60, def) : 0 };
      tweaks.push('muted');
    } else if (input.mute === false) {
      const def = getParamDef('jbs', slot, 'level');
      session.jbsParams[slot] = { ...session.jbsParams[slot], level: def ? toEngine(0, def) : 0.5 };
      tweaks.push('unmuted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('jbs', slot, 'level');
      session.jbsParams[slot] = { ...session.jbsParams[slot], level: def ? toEngine(input.level, def) : input.level };
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones
    if (input.tune !== undefined) {
      session.jbsParams[slot] = { ...session.jbsParams[slot], tune: input.tune };
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Attack: 0-100 → 0-1
    if (input.attack !== undefined) {
      const def = getParamDef('jbs', slot, 'attack');
      session.jbsParams[slot] = { ...session.jbsParams[slot], attack: def ? toEngine(input.attack, def) : input.attack / 100 };
      tweaks.push(`attack=${input.attack}`);
    }

    // Decay: 0-100 → 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('jbs', slot, 'decay');
      session.jbsParams[slot] = { ...session.jbsParams[slot], decay: def ? toEngine(input.decay, def) : input.decay / 100 };
      tweaks.push(`decay=${input.decay}`);
    }

    // Filter: Hz → 0-1 (log scale)
    if (input.filter !== undefined) {
      const def = getParamDef('jbs', slot, 'filter');
      session.jbsParams[slot] = { ...session.jbsParams[slot], filter: def ? toEngine(input.filter, def) : input.filter };
      const display = input.filter >= 1000 ? `${(input.filter/1000).toFixed(1)}kHz` : `${input.filter}Hz`;
      tweaks.push(`filter=${display}`);
    }

    // Pan: -100 to +100 → -1 to +1
    if (input.pan !== undefined) {
      const def = getParamDef('jbs', slot, 'pan');
      session.jbsParams[slot] = { ...session.jbsParams[slot], pan: def ? toEngine(input.pan, def) : input.pan / 100 };
      const panDisplay = input.pan === 0 ? 'C' : (input.pan < 0 ? `L${Math.abs(input.pan)}` : `R${input.pan}`);
      tweaks.push(`pan=${panDisplay}`);
    }

    // Get slot name from kit
    const slotMeta = session.jbsKit?.slots.find(s => s.id === slot);
    const slotName = slotMeta ? slotMeta.name : slot;

    return `JB-S ${slotName}: ${tweaks.join(', ')}`;
  },

  /**
   * Show current JB-S state (loaded kit, slots, pattern)
   */
  show_jbs: async (input, session, context) => {
    const kit = session.jbsKit;

    if (!kit) {
      return 'JB-S: No kit loaded. Use load_jbs_kit to load one.';
    }

    const lines = ['JB-S SAMPLER:', ''];
    lines.push(`Kit: ${kit.name} (${kit.id})`);
    lines.push('');
    lines.push('Slots:');

    for (const slot of kit.slots) {
      const pattern = session.jbsPattern[slot.id] || [];
      const hits = pattern.filter(s => s?.velocity > 0).length;
      const params = session.jbsParams[slot.id] || {};
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
  create_jbs_kit: async (input, session, context) => {
    const { source_folder, kit_id, kit_name, slots } = input;

    // Smart path resolution - try multiple locations
    const resolvePath = (p) => {
      if (p.startsWith('/')) return p;
      if (p.startsWith('~')) return p.replace('~', homedir());

      const candidates = [
        p,
        join(homedir(), p),
        join(homedir(), 'Documents', p),
        join(homedir(), 'Documents', 'Jambot', p),
        join(homedir(), 'Desktop', p),
        join(homedir(), 'Downloads', p),
        join(homedir(), 'Music', p),
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
      }
      return null;
    };

    const sourcePath = resolvePath(source_folder);

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
      return `Found ${files.length} audio files in ${source_folder}:\n${fileList}${extra}\n\nAsk the user what to name each sound (or use auto-naming based on filenames). Then call create_jbs_kit again with the slots array.`;
    }

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

      if (ext === '.wav') {
        copyFileSync(sourceFile, destFile);
      } else {
        let converted = false;

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

    // Auto-load the kit
    const newKit = loadKit(kit_id);
    session.jbsKit = newKit;
    session.jbsPattern = {};

    const slotSummary = newKit.slots.map(s => `${s.id}: ${s.name} (${s.short})`).join('\n');
    return `Created and loaded kit "${kit_name}" (${kit_id})\n\nSlots ready to use:\n${slotSummary}\n\nUse add_jbs to program patterns. Example: add_jbs with s1:[0,4,8,12] for kicks on beats.`;
  },
};

registerTools(jbsTools);
