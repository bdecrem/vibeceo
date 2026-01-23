/**
 * Tool Definitions for Anthropic API
 *
 * This file contains the schema definitions for all 65 tools available to the Jambot agent.
 * These are passed directly to Anthropic's messages.create() as the tools parameter.
 */

export const TOOLS = [
  {
    name: "create_session",
    description: "Create a new music session with a specific BPM",
    input_schema: {
      type: "object",
      properties: {
        bpm: { type: "number", description: "Beats per minute (60-200)" }
      },
      required: ["bpm"]
    }
  },
  {
    name: "add_drums",
    description: "Add a drum pattern. For simple patterns, use step arrays like [0,4,8,12]. For detailed velocity control, use objects like [{step:0,vel:1},{step:4,vel:0.5}]. Available voices: kick, snare, clap, ch (closed hat), oh (open hat), ltom, mtom, htom, rimshot, crash, ride.",
    input_schema: {
      type: "object",
      properties: {
        kick: { type: "array", description: "Steps for kick. Simple: [0,4,8,12] or detailed: [{step:0,vel:1},{step:8,vel:0.7}]" },
        snare: { type: "array", description: "Steps for snare" },
        clap: { type: "array", description: "Steps for clap" },
        ch: { type: "array", description: "Steps for closed hi-hat" },
        oh: { type: "array", description: "Steps for open hi-hat" },
        ltom: { type: "array", description: "Steps for low tom" },
        mtom: { type: "array", description: "Steps for mid tom" },
        htom: { type: "array", description: "Steps for high tom" },
        rimshot: { type: "array", description: "Steps for rimshot" },
        crash: { type: "array", description: "Steps for crash cymbal" },
        ride: { type: "array", description: "Steps for ride cymbal" }
      },
      required: []
    }
  },
  {
    name: "set_swing",
    description: "Set the swing amount to push off-beat notes (steps 1,3,5,7,9,11,13,15) later for groove",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Swing amount 0-100. 0=straight, 50=medium groove, 70+=heavy shuffle" }
      },
      required: ["amount"]
    }
  },
  {
    name: "list_909_kits",
    description: "List available 909 kits (sound presets) for R9D9",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_909_kit",
    description: "Load a 909 kit (sound preset) for R9D9. Kits set the engine type and default voice parameters.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID (e.g., 'bart-deep', 'punchy', 'boomy')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_101_presets",
    description: "List available 101 presets (sound + pattern presets) for R1D1 lead synth",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_101_preset",
    description: "Load a 101 preset for R1D1 lead synth. Presets include sound parameters and optionally a pattern.",
    input_schema: {
      type: "object",
      properties: {
        preset: { type: "string", description: "Preset ID (e.g., 'classicLead', 'fatBass', 'acidLine')" },
        includePattern: { type: "boolean", description: "Also load the preset's pattern (default: true)" }
      },
      required: ["preset"]
    }
  },
  {
    name: "tweak_drums",
    description: "Adjust drum voice parameters. UNITS: level in dB (-60 to +6), tune in semitones (-12 to +12), decay/attack/tone/snappy/sweep as 0-100, hi-hat tone in Hz (4000-16000). Use mute:true to silence a voice.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to tweak"
        },
        mute: { type: "boolean", description: "Mute this voice (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity, -6dB = half volume" },
        tune: { type: "number", description: "Pitch in semitones (-12 to +12). -2 = 2 semitones down" },
        decay: { type: "number", description: "Decay 0-100. 0=tight/punchy, 100=long/boomy" },
        tone: { type: "number", description: "Brightness. For hats: Hz (4000-16000). Others: 0-100 (0=dark, 100=bright)" },
        attack: { type: "number", description: "Kick click intensity 0-100. 0=soft, 100=clicky (kick only)" },
        sweep: { type: "number", description: "Kick pitch envelope 0-100. 0=flat, 100=full sweep (kick only)" },
        snappy: { type: "number", description: "Snare wire rattle 0-100 (snare only)" },
        engine: { type: "string", enum: ["E1", "E2"], description: "Engine version: E1=simpler, E2=authentic" },
        useSample: { type: "boolean", description: "Use real 909 samples (ch, oh, crash, ride only)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "set_drum_groove",
    description: "Set global R9D9 groove parameters: flam, pattern length, scale mode, and accent.",
    input_schema: {
      type: "object",
      properties: {
        flam: { type: "number", description: "Flam amount (0-1). Adds ghost note before main hit for fuller sound." },
        patternLength: { type: "number", description: "Pattern length in steps (1-16). Default 16." },
        scale: { type: "string", enum: ["16th", "8th-triplet", "16th-triplet", "32nd"], description: "Time scale. 16th=standard, triplets for shuffle, 32nd for double-time." },
        globalAccent: { type: "number", description: "Global accent strength (0-1). Multiplier for accented hits." }
      }
    }
  },
  {
    name: "automate_drums",
    description: "Add per-step parameter automation to a drum voice. This is 'knob mashing' - dynamic parameter changes over time. Provide an array of 16 values for the parameter, one per step. Use null to keep the default value for that step. Uses SAME UNITS as tweak_drums: decay/attack/tone/sweep/snappy are 0-100, level is dB (-60 to +6), tune is semitones (±12).",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to automate"
        },
        param: {
          type: "string",
          enum: ["decay", "tune", "tone", "level", "attack", "sweep", "snappy"],
          description: "Which parameter to automate"
        },
        values: {
          type: "array",
          description: "Array of 16 values (one per step). Use null to keep default. Same units as tweak_drums. Example for decay: [20, 80, 30, 90, null, 50, ...] where 0=tight, 100=loose.",
          items: { type: ["number", "null"] }
        }
      },
      required: ["voice", "param", "values"]
    }
  },
  {
    name: "clear_automation",
    description: "Clear automation from a drum voice. Use this before saving a pattern that should NOT have knob-mashing. Call without params to clear ALL automation.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to clear automation from. Omit to clear all voices."
        },
        param: {
          type: "string",
          enum: ["decay", "tune", "tone", "level", "attack", "sweep", "snappy"],
          description: "Which parameter to clear. Omit to clear all params for the voice."
        }
      },
      required: []
    }
  },
  {
    name: "render",
    description: "Render the current session to a WAV file. If arrangement is set, renders the full song. Otherwise renders current patterns for specified bars.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Output filename (without .wav extension)" },
        bars: { type: "number", description: "Number of bars to render (default: 2, ignored if arrangement is set)" }
      },
      required: ["filename"]
    }
  },
  // SONG MODE (patterns + arrangement)
  {
    name: "save_pattern",
    description: "Save the current working pattern for an instrument to a named slot (A, B, C, etc). This captures the current pattern, params, and automation.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument's pattern to save" },
        name: { type: "string", description: "Pattern name (A, B, C, etc)" }
      },
      required: ["instrument", "name"]
    }
  },
  {
    name: "load_pattern",
    description: "Load a saved pattern into the current working pattern for an instrument. This replaces the current pattern with the saved one.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument's pattern to load" },
        name: { type: "string", description: "Pattern name to load (A, B, C, etc)" }
      },
      required: ["instrument", "name"]
    }
  },
  {
    name: "copy_pattern",
    description: "Copy a saved pattern to a new name. Useful for creating variations.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument" },
        from: { type: "string", description: "Source pattern name (A, B, etc)" },
        to: { type: "string", description: "Destination pattern name" }
      },
      required: ["instrument", "from", "to"]
    }
  },
  {
    name: "list_patterns",
    description: "List all saved patterns for each instrument",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "set_arrangement",
    description: "Set the song arrangement. Each section specifies bars and which pattern each instrument plays. Patterns loop to fill the section. Omit an instrument to silence it for that section.",
    input_schema: {
      type: "object",
      properties: {
        sections: {
          type: "array",
          description: "Array of sections. Each section: {bars: 4, drums: 'A', bass: 'A', lead: 'B', sampler: 'A', jb200: 'A'}",
          items: {
            type: "object",
            properties: {
              bars: { type: "number", description: "Number of bars for this section" },
              drums: { type: "string", description: "Drum pattern name (or omit to silence)" },
              bass: { type: "string", description: "Bass pattern name (or omit to silence)" },
              lead: { type: "string", description: "Lead pattern name (or omit to silence)" },
              sampler: { type: "string", description: "Sampler pattern name (or omit to silence)" },
              jb200: { type: "string", description: "JB200 bass pattern name (or omit to silence)" }
            },
            required: ["bars"]
          }
        }
      },
      required: ["sections"]
    }
  },
  {
    name: "clear_arrangement",
    description: "Clear the arrangement to go back to single-pattern mode",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "show_arrangement",
    description: "Show the current arrangement and all saved patterns",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // R3D3 (TB-303 acid bass)
  {
    name: "add_bass",
    description: "Add a bass line pattern using R3D3 (TB-303 acid synth). Provide an array of 16 steps. Each step has: note (C2, D#2, etc), gate (true/false), accent (true/false), slide (true/false for glide to next note).",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, slide: false}. Use gate:false for rests.",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C2, D#2, E2, etc). Bass range: C1-C3" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra punch" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_bass",
    description: "Adjust R3D3 bass synth parameters. UNITS: level in dB (-60 to +6), cutoff in Hz (100-10000), resonance/envMod/decay/accent as 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute bass (sets level to -60dB, effectively silent)" },
        waveform: { type: "string", enum: ["sawtooth", "square"], description: "Oscillator waveform" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        cutoff: { type: "number", description: "Filter cutoff in Hz (100-10000). 500=dark, 2000=medium, 5000=bright" },
        resonance: { type: "number", description: "Filter resonance 0-100. 0=clean, 80+=screaming acid" },
        envMod: { type: "number", description: "Filter envelope depth 0-100. Higher = more wah on each note" },
        decay: { type: "number", description: "Filter envelope decay 0-100. How quickly filter closes" },
        accent: { type: "number", description: "Accent intensity 0-100. How much accented notes pop" }
      },
      required: []
    }
  },
  // R1D1 (SH-101 lead synth)
  {
    name: "add_lead",
    description: "Add a lead/synth pattern using R1D1 (SH-101 synth). Provide an array of 16 steps. Each step has: note, gate, accent, slide.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C3', gate: true, accent: false, slide: false}. Lead range: C2-C5",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C3, D#3, E4, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra emphasis" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_lead",
    description: "Adjust R1D1 lead synth parameters. UNITS: level in dB, cutoff in Hz (20-16000), all others 0-100. LFO pitch mod in semitones. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        // Output
        mute: { type: "boolean", description: "Mute lead (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        // Oscillators
        vcoSaw: { type: "number", description: "Sawtooth level 0-100" },
        vcoPulse: { type: "number", description: "Pulse/square level 0-100" },
        pulseWidth: { type: "number", description: "Pulse width 5-95. 50=square wave" },
        // Sub-oscillator
        subLevel: { type: "number", description: "Sub-oscillator level 0-100. Adds low-end beef" },
        subMode: { type: "number", description: "Sub mode: 0=-1oct square, 1=-1oct pulse, 2=-2oct pulse" },
        // Filter
        cutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 500=dark, 2000=medium" },
        resonance: { type: "number", description: "Filter resonance 0-100. 100=self-oscillates" },
        envMod: { type: "number", description: "Filter envelope depth 0-100" },
        // Envelope
        attack: { type: "number", description: "Envelope attack 0-100. 0=instant, 100=slow" },
        decay: { type: "number", description: "Envelope decay 0-100" },
        sustain: { type: "number", description: "Envelope sustain level 0-100" },
        release: { type: "number", description: "Envelope release 0-100. How long note tails" },
        // LFO
        lfoRate: { type: "number", description: "LFO speed 0-100. 0=slow wobble, 100=fast" },
        lfoWaveform: { type: "string", enum: ["triangle", "square", "random"], description: "LFO shape" },
        lfoToPitch: { type: "number", description: "LFO to pitch in semitones (0-24). Vibrato depth" },
        lfoToFilter: { type: "number", description: "LFO to filter 0-100. Wah/wobble depth" },
        lfoToPW: { type: "number", description: "LFO to pulse width 0-100. PWM movement" }
      },
      required: []
    }
  },
  // JB200 (Bass Monosynth)
  {
    name: "add_jb200",
    description: "Add a bass pattern using JB200 (2-oscillator bass monosynth). Provide an array of 16 steps. Each step has: note, gate, accent, slide.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, slide: false}. Bass range: C1-C3",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C1, D2, E2, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra attack and filter opening" },
              slide: { type: "boolean", description: "Glide/portamento to this note from previous" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_jb200",
    description: "Adjust JB200 bass synth parameters. UNITS: level in dB (-60 to +6), filterCutoff in Hz (20-16000), detune in cents (-50 to +50), filterEnvAmount (-100 to +100), octaves in semitones, all others 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        // Output
        mute: { type: "boolean", description: "Mute bass (sets level to -60dB)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        // Oscillator 1
        osc1Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 1 waveform" },
        osc1Octave: { type: "number", description: "Osc 1 octave shift in semitones (-24 to +24)" },
        osc1Detune: { type: "number", description: "Osc 1 fine tune (-50 to +50)" },
        osc1Level: { type: "number", description: "Osc 1 level 0-100" },
        // Oscillator 2
        osc2Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 2 waveform" },
        osc2Octave: { type: "number", description: "Osc 2 octave shift in semitones (-24 to +24). -12 = one octave down" },
        osc2Detune: { type: "number", description: "Osc 2 fine tune (-50 to +50). 5-10 adds fatness" },
        osc2Level: { type: "number", description: "Osc 2 level 0-100" },
        // Filter
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 400=warm, 1200=present, 4000=bright" },
        filterResonance: { type: "number", description: "Filter resonance 0-100. Adds bite at 40-60" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth -100 to +100. Positive opens filter on attack" },
        // Filter envelope
        filterAttack: { type: "number", description: "Filter envelope attack 0-100" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100. Short (10-40) for plucky bass" },
        filterSustain: { type: "number", description: "Filter envelope sustain 0-100" },
        filterRelease: { type: "number", description: "Filter envelope release 0-100" },
        // Amp envelope
        ampAttack: { type: "number", description: "Amp envelope attack 0-100. 0 for punchy" },
        ampDecay: { type: "number", description: "Amp envelope decay 0-100" },
        ampSustain: { type: "number", description: "Amp envelope sustain 0-100. 50-80 for bass" },
        ampRelease: { type: "number", description: "Amp envelope release 0-100. 10-30 for tight bass" },
        // Drive
        drive: { type: "number", description: "Output saturation 0-100. Adds harmonics and grit" }
      },
      required: []
    }
  },
  // JB200 Kit/Sequence tools
  {
    name: "list_jb200_kits",
    description: "List available JB200 sound presets (kits). Use when user asks 'what JB200 sounds are there' or 'show bass presets'.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb200_kit",
    description: "Load a JB200 kit (sound preset). Applies oscillator, filter, envelope, and drive settings. Use 'default' for the classic sound.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID or name (e.g., 'default', 'acid', 'sub')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_jb200_sequences",
    description: "List available JB200 pattern presets (sequences). Use when user asks 'what JB200 patterns are there' or 'show bass lines'.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb200_sequence",
    description: "Load a JB200 sequence (pattern preset). Applies the note pattern with gates, accents, and slides. Use 'default' for the classic acid line.",
    input_schema: {
      type: "object",
      properties: {
        sequence: { type: "string", description: "Sequence ID or name (e.g., 'default', 'minimal', 'busy')" }
      },
      required: ["sequence"]
    }
  },
  // JB01 (Reference Drum Machine)
  {
    name: "add_jb01",
    description: "Add JB01 drum pattern (reference drum machine). 8 voices: kick, snare, clap, ch (closed hat), oh (open hat), perc, tom, cymbal. Pass step arrays [0,4,8,12] for each voice.",
    input_schema: {
      type: "object",
      properties: {
        kick: { type: "array", items: { type: "number" }, description: "Kick steps (0-15)" },
        snare: { type: "array", items: { type: "number" }, description: "Snare steps (0-15)" },
        clap: { type: "array", items: { type: "number" }, description: "Clap steps (0-15)" },
        ch: { type: "array", items: { type: "number" }, description: "Closed hi-hat steps (0-15)" },
        oh: { type: "array", items: { type: "number" }, description: "Open hi-hat steps (0-15)" },
        perc: { type: "array", items: { type: "number" }, description: "Percussion steps (0-15)" },
        tom: { type: "array", items: { type: "number" }, description: "Tom steps (0-15)" },
        cymbal: { type: "array", items: { type: "number" }, description: "Cymbal steps (0-15)" }
      },
      required: []
    }
  },
  {
    name: "tweak_jb01",
    description: "Adjust JB01 drum voice parameters. UNITS: level in dB (-60 to +6), tune in semitones (-12 to +12), decay/attack/sweep/tone/snappy 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        voice: { type: "string", enum: ["kick", "snare", "clap", "ch", "oh", "perc", "tom", "cymbal"], description: "Voice to tweak (required)" },
        mute: { type: "boolean", description: "Mute voice (sets level to -60dB)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        tune: { type: "number", description: "Pitch in semitones (-12 to +12)" },
        decay: { type: "number", description: "Decay time 0-100" },
        attack: { type: "number", description: "Attack/click amount 0-100 (kick only)" },
        sweep: { type: "number", description: "Pitch sweep depth 0-100 (kick only)" },
        tone: { type: "number", description: "Tone/brightness 0-100 (hats, snare, clap)" },
        snappy: { type: "number", description: "Snare snappiness 0-100 (snare only)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "list_jb01_kits",
    description: "List available JB01 sound presets (kits).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb01_kit",
    description: "Load a JB01 sound preset (kit).",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID to load" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_jb01_sequences",
    description: "List available JB01 pattern presets (sequences).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb01_sequence",
    description: "Load a JB01 pattern preset (sequence).",
    input_schema: {
      type: "object",
      properties: {
        sequence: { type: "string", description: "Sequence ID to load" }
      },
      required: ["sequence"]
    }
  },
  {
    name: "show_jb01",
    description: "Show current JB01 state (pattern and parameters).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "rename_project",
    description: "Rename the current project. Use when user says 'rename to X' or 'call this X'.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New name for the project" }
      },
      required: ["name"]
    }
  },
  {
    name: "list_projects",
    description: "List all saved projects. Use when user asks 'what projects do I have' or 'show my projects'.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "open_project",
    description: "Open an existing project by name or folder. Use 'recent' or 'latest' to open the most recently modified project. Use when user says 'open project X', 'continue working on X', 'open my recent project', or 'continue where we left off'.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name, folder name, or 'recent'/'latest' to open most recently modified" }
      },
      required: ["name"]
    }
  },
  // R9DS Sampler tools
  {
    name: "list_kits",
    description: "List all available sample kits (bundled + user kits from ~/Documents/Jambot/kits/)",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_kit",
    description: "Load a sample kit for R9DS. Use list_kits first to see available kits.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID to load (e.g., '808', 'amber')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "add_samples",
    description: "Add sample patterns to R9DS. Must load_kit first. Slots are s1-s10. For simple patterns use step arrays [0,4,8,12]. For velocity control use [{step:0,vel:1},{step:4,vel:0.5}].",
    input_schema: {
      type: "object",
      properties: {
        s1: { type: "array", description: "Steps for slot 1 (usually kick)" },
        s2: { type: "array", description: "Steps for slot 2 (usually snare)" },
        s3: { type: "array", description: "Steps for slot 3 (usually clap)" },
        s4: { type: "array", description: "Steps for slot 4 (usually closed hat)" },
        s5: { type: "array", description: "Steps for slot 5 (usually open hat)" },
        s6: { type: "array", description: "Steps for slot 6" },
        s7: { type: "array", description: "Steps for slot 7" },
        s8: { type: "array", description: "Steps for slot 8" },
        s9: { type: "array", description: "Steps for slot 9" },
        s10: { type: "array", description: "Steps for slot 10" }
      },
      required: []
    }
  },
  {
    name: "tweak_samples",
    description: "Tweak R9DS sample parameters. UNITS: level in dB, tune in semitones, attack/decay 0-100, filter in Hz, pan L/R -100 to +100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", description: "Which slot to tweak (s1-s10)" },
        mute: { type: "boolean", description: "Mute this sample slot (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        tune: { type: "number", description: "Pitch in semitones (-24 to +24)" },
        attack: { type: "number", description: "Fade in 0-100. 0=instant" },
        decay: { type: "number", description: "Sample length 0-100. 0=short chop, 100=full sample" },
        filter: { type: "number", description: "Lowpass filter in Hz (200-20000). 20000=no filter" },
        pan: { type: "number", description: "Stereo position (-100=L, 0=C, +100=R)" }
      },
      required: ["slot"]
    }
  },
  {
    name: "create_kit",
    description: "Create a new sample kit from audio files in a folder. Scans the folder for WAV/AIFF/MP3 files and creates a kit in ~/Documents/Jambot/kits/. Returns the list of found files so you can ask the user what to name each slot.",
    input_schema: {
      type: "object",
      properties: {
        source_folder: { type: "string", description: "Path to folder containing audio files" },
        kit_id: { type: "string", description: "ID for the new kit (lowercase, no spaces, e.g., 'my-drums')" },
        kit_name: { type: "string", description: "Display name for the kit (e.g., 'My Drums')" },
        slots: {
          type: "array",
          description: "Array of slot assignments. Each item: {file: 'original-filename.wav', name: 'Kick', short: 'KK'}. If not provided, tool returns found files for you to ask user.",
          items: {
            type: "object",
            properties: {
              file: { type: "string", description: "Original filename from source folder" },
              name: { type: "string", description: "Descriptive name for this sound" },
              short: { type: "string", description: "2-3 letter abbreviation" }
            }
          }
        }
      },
      required: ["source_folder", "kit_id", "kit_name"]
    }
  },
  // === MIXER TOOLS ===
  {
    name: "create_send",
    description: "Create a send bus with an effect. For reverb: Dattorro plate algorithm with full controls. Multiple voices can send to the same bus.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the send bus (e.g., 'reverb', 'delay')" },
        effect: { type: "string", enum: ["reverb", "eq"], description: "Type of effect for the bus" },
        // Plate reverb parameters
        decay: { type: "number", description: "Reverb tail length in seconds (0.5-10, default 2). Short for tight drums, long for pads." },
        damping: { type: "number", description: "High-frequency rolloff (0-1, default 0.5). 0=bright/shimmery, 1=dark/warm." },
        predelay: { type: "number", description: "Gap before reverb starts in ms (0-100, default 20). Adds clarity, separates dry from wet." },
        modulation: { type: "number", description: "Subtle pitch wobble (0-1, default 0.3). Adds movement and shimmer." },
        lowcut: { type: "number", description: "Remove low frequencies from reverb in Hz (20-500, default 100). Keeps bass tight." },
        highcut: { type: "number", description: "Remove high frequencies from reverb in Hz (2000-20000, default 8000). Tames harshness." },
        width: { type: "number", description: "Stereo spread (0-1, default 1). 0=mono, 1=full stereo." },
        mix: { type: "number", description: "Wet/dry balance (0-1, default 0.3). How much reverb in the send output." }
      },
      required: ["name", "effect"]
    }
  },
  {
    name: "tweak_reverb",
    description: "Adjust reverb parameters on an existing send bus. Use this to fine-tune the reverb sound.",
    input_schema: {
      type: "object",
      properties: {
        send: { type: "string", description: "Name of the reverb send bus to tweak" },
        decay: { type: "number", description: "Tail length in seconds (0.5-10)" },
        damping: { type: "number", description: "High-frequency rolloff (0-1). 0=bright, 1=dark." },
        predelay: { type: "number", description: "Gap before reverb in ms (0-100)" },
        modulation: { type: "number", description: "Pitch wobble for shimmer (0-1)" },
        lowcut: { type: "number", description: "Low cut frequency in Hz (20-500)" },
        highcut: { type: "number", description: "High cut frequency in Hz (2000-20000)" },
        width: { type: "number", description: "Stereo spread (0-1)" },
        mix: { type: "number", description: "Wet/dry balance (0-1)" }
      },
      required: ["send"]
    }
  },
  {
    name: "route_to_send",
    description: "Route a voice or channel to a send bus. Use this to add reverb/effects to specific sounds.",
    input_schema: {
      type: "object",
      properties: {
        voice: { type: "string", description: "Voice to route (e.g., 'kick', 'snare', 'ch', 'oh', 'bass', 'lead')" },
        send: { type: "string", description: "Name of the send bus to route to" },
        level: { type: "number", description: "Send level (0-1, default 0.3)" }
      },
      required: ["voice", "send"]
    }
  },
  {
    name: "add_channel_insert",
    description: "Add an insert effect to a channel or individual drum voice. Supports per-voice filtering on drums (kick, snare, ch, etc).",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200", "kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"], description: "Channel or drum voice to add effect to" },
        effect: { type: "string", enum: ["eq", "filter", "ducker"], description: "Type of effect" },
        preset: { type: "string", description: "Effect preset (eq: 'acidBass'/'crispHats'/'warmPad'; filter: 'dubDelay'/'telephone'/'lofi')" },
        params: {
          type: "object",
          description: "Effect parameters (eq: highpass, lowGain, midGain, midFreq, highGain; filter: mode, cutoff, resonance; ducker: amount, trigger)"
        }
      },
      required: ["channel", "effect"]
    }
  },
  {
    name: "remove_channel_insert",
    description: "Remove a channel insert effect (filter, eq, ducker). Use to clear effects from a pattern before saving.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200", "kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"], description: "Channel or drum voice to remove effect from" },
        effect: { type: "string", enum: ["eq", "filter", "ducker", "all"], description: "Type of effect to remove, or 'all' to clear all inserts" }
      },
      required: ["channel"]
    }
  },
  {
    name: "add_sidechain",
    description: "Add sidechain ducking - make one sound duck when another plays (classic pump effect).",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "What to duck (e.g., 'bass', 'lead', 'sampler')" },
        trigger: { type: "string", description: "What triggers the duck (e.g., 'kick')" },
        amount: { type: "number", description: "How much to duck (0-1, default 0.5)" }
      },
      required: ["target", "trigger"]
    }
  },
  {
    name: "add_master_insert",
    description: "Add an insert effect to the master bus. Affects the entire mix.",
    input_schema: {
      type: "object",
      properties: {
        effect: { type: "string", enum: ["eq", "reverb"], description: "Type of effect" },
        preset: { type: "string", description: "Effect preset (eq: 'master', reverb: 'plate'/'room')" },
        params: { type: "object", description: "Effect parameters" }
      },
      required: ["effect"]
    }
  },
  {
    name: "analyze_render",
    description: "Analyze the last rendered WAV file. Returns levels, frequency balance, sidechain detection, and recommendations.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to analyze (defaults to last rendered)" }
      },
      required: []
    }
  },
  {
    name: "show_mixer",
    description: "Show current mixer configuration (sends, routing, effects).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // === EFFECT CHAIN TOOLS ===
  {
    name: "add_effect",
    description: "Add an effect to any target (instrument, voice, or master). Effects chain in order. Use 'after' param to insert after a specific effect.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target for effect: instrument (jb01, jb200), voice (jb01.ch, jb01.kick, jb01.snare), or 'master'" },
        effect: { type: "string", enum: ["delay", "reverb"], description: "Type of effect to add" },
        after: { type: "string", description: "Insert after this effect type/ID (for ordering). Omit to append." },
        // Delay params
        mode: { type: "string", enum: ["analog", "pingpong"], description: "Delay mode: analog (mono+saturation) or pingpong (stereo bounce)" },
        time: { type: "number", description: "Delay time in ms (1-2000, default 375)" },
        sync: { type: "string", enum: ["off", "8th", "dotted8th", "triplet8th", "16th", "quarter"], description: "Tempo sync mode" },
        feedback: { type: "number", description: "Feedback amount 0-100 (default 50)" },
        mix: { type: "number", description: "Wet/dry mix 0-100 (default 30)" },
        lowcut: { type: "number", description: "Remove mud from feedback, Hz (default 80)" },
        highcut: { type: "number", description: "Tame harshness, Hz (default 8000)" },
        saturation: { type: "number", description: "Analog warmth 0-100 (analog mode only, default 20)" },
        spread: { type: "number", description: "Stereo width 0-100 (pingpong mode only, default 100)" },
        // Reverb params
        decay: { type: "number", description: "Reverb tail length in seconds (0.5-10, default 2)" },
        damping: { type: "number", description: "High-frequency rolloff (0-1, default 0.5)" },
        predelay: { type: "number", description: "Gap before reverb in ms (0-100, default 10)" },
        modulation: { type: "number", description: "Pitch wobble for shimmer (0-1, default 0.2)" },
        width: { type: "number", description: "Stereo spread (0-1, default 1)" }
      },
      required: ["target", "effect"]
    }
  },
  {
    name: "remove_effect",
    description: "Remove an effect from a target's chain.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target to remove from: instrument (jb01), voice (jb01.ch), or 'master'" },
        effect: { type: "string", description: "Effect type or ID to remove, or 'all' to clear entire chain" }
      },
      required: ["target"]
    }
  },
  {
    name: "show_effects",
    description: "Display all effect chains across all targets.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "tweak_effect",
    description: "Modify parameters on an existing effect in a target's chain.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target: instrument (jb01), voice (jb01.ch), or 'master'" },
        effect: { type: "string", description: "Effect type or ID to tweak" },
        // All effect params supported
        mode: { type: "string", enum: ["analog", "pingpong"], description: "Delay mode" },
        time: { type: "number", description: "Delay time in ms" },
        sync: { type: "string", enum: ["off", "8th", "dotted8th", "triplet8th", "16th", "quarter"], description: "Tempo sync" },
        feedback: { type: "number", description: "Feedback amount 0-100" },
        mix: { type: "number", description: "Wet/dry mix 0-100" },
        lowcut: { type: "number", description: "Lowcut frequency Hz" },
        highcut: { type: "number", description: "Highcut frequency Hz" },
        saturation: { type: "number", description: "Analog warmth 0-100" },
        spread: { type: "number", description: "Stereo width 0-100" },
        decay: { type: "number", description: "Reverb tail seconds" },
        damping: { type: "number", description: "Reverb damping 0-1" },
        predelay: { type: "number", description: "Reverb predelay ms" },
        modulation: { type: "number", description: "Reverb modulation 0-1" },
        width: { type: "number", description: "Reverb stereo width 0-1" }
      },
      required: ["target", "effect"]
    }
  },
  // === PRESET TOOLS (Generic) ===
  {
    name: "save_preset",
    description: "Save current instrument settings as a user preset. Works for any instrument (drums, bass, lead, sampler). Presets are stored in ~/Documents/Jambot/presets/.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument to save preset for" },
        id: { type: "string", description: "Preset ID (lowercase, hyphenated, e.g., 'my-deep-kick')" },
        name: { type: "string", description: "Display name (e.g., 'My Deep Kick')" },
        description: { type: "string", description: "Optional description of the preset's sound" }
      },
      required: ["instrument", "id", "name"]
    }
  },
  {
    name: "load_preset",
    description: "Load a user preset for an instrument. Applies saved parameters to the current session.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument to load preset for" },
        id: { type: "string", description: "Preset ID to load" }
      },
      required: ["instrument", "id"]
    }
  },
  {
    name: "list_presets",
    description: "List available user presets. Can filter by instrument or show all.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Filter by instrument (optional, shows all if omitted)" }
      },
      required: []
    }
  },
  // === GENERIC PARAMETER TOOLS (Unified System) ===
  {
    name: "get_param",
    description: "Get any parameter value via unified path. Works for ALL instruments and parameters including engine settings. Examples: 'drums.snare.engine' → 'E2', 'drums.kick.decay' → 37, 'bass.cutoff' → 2000, 'drums.ch.useSample' → false",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'drums.kick.decay', 'drums.snare.engine', 'bass.cutoff')" }
      },
      required: ["path"]
    }
  },
  {
    name: "tweak",
    description: "Set any parameter value via unified path. Works for ALL instruments including engine settings. Examples: tweak drums.kick.decay to 50, tweak drums.snare.engine to 'E1', tweak bass.cutoff to 3000",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'drums.kick.decay', 'drums.snare.engine', 'bass.cutoff')" },
        value: { description: "Value to set (number, string, or boolean depending on parameter)" }
      },
      required: ["path", "value"]
    }
  },
  {
    name: "tweak_multi",
    description: "Set multiple parameters at once via unified paths.",
    input_schema: {
      type: "object",
      properties: {
        params: { type: "object", description: "Object mapping paths to values, e.g., { 'drums.kick.decay': 50, 'drums.snare.engine': 'E1' }" }
      },
      required: ["params"]
    }
  },
  {
    name: "list_params",
    description: "List available parameters for a node (instrument). Shows all params with their types, ranges, and defaults.",
    input_schema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node to list params for (drums, bass, lead, sampler). Omit to list all available nodes." }
      },
      required: []
    }
  },
  {
    name: "get_state",
    description: "Get current state of all parameters for a node, optionally filtered by voice.",
    input_schema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node to get state for (drums, bass, lead, sampler)" },
        voice: { type: "string", description: "Optional: filter to specific voice (e.g., 'kick', 'snare')" }
      },
      required: ["node"]
    }
  }
];
