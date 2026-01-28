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
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler", "jt10", "jt30", "jt90"], description: "Which instrument's pattern to save" },
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
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler", "jt10", "jt30", "jt90"], description: "Which instrument's pattern to load" },
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
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler", "jt10", "jt30", "jt90"], description: "Which instrument" },
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
          description: "Array of sections. Each section: {bars: 4, jb01: 'A', jb202: 'A', sampler: 'A', jt10: 'A', jt30: 'A', jt90: 'A'}",
          items: {
            type: "object",
            properties: {
              bars: { type: "number", description: "Number of bars for this section" },
              jb01: { type: "string", description: "JB01 drum pattern name (or omit to silence)" },
              jb202: { type: "string", description: "JB202 bass pattern name (or omit to silence)" },
              sampler: { type: "string", description: "Sampler pattern name (or omit to silence)" },
              jt10: { type: "string", description: "JT10 lead pattern name (or omit to silence)" },
              jt30: { type: "string", description: "JT30 acid bass pattern name (or omit to silence)" },
              jt90: { type: "string", description: "JT90 drum pattern name (or omit to silence)" }
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
  {
    name: "test_tone",
    description: "Render a pure test tone for audio analysis. Outputs a clean saw wave with flat envelope (no ADSR shaping). Default is A440 (A4) for 1 second.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string", description: "Note name (default 'A4' = 440Hz)" },
        duration: { type: "number", description: "Duration in seconds (default 1.0)" }
      }
    }
  },
  // JB202 (Modular Bass Synth with Custom DSP)
  {
    name: "add_jb202",
    description: "Add a bass pattern using JB202 (modular bass synth with custom DSP). Uses PolyBLEP oscillators, 24dB cascaded biquad filter, and soft-clip drive. Produces identical output in browser and Node.js.",
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
    name: "tweak_jb202",
    description: "Adjust JB202 bass synth parameters (custom DSP version). UNITS: level in dB (-60 to +6, 0=unity), filterCutoff in Hz (20-16000), detune in cents (-50 to +50), filterEnvAmount (-100 to +100), octaves in semitones, all others 0-100. Use mute:true to silence. Use levelDelta for relative dB adjustments (e.g., levelDelta:-5 to reduce by 5dB).",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute bass (sets level to -60dB)" },
        level: { type: "number", description: "Output level in dB (-60 to +6, 0=unity gain)" },
        levelDelta: { type: "number", description: "Relative level adjustment in dB (e.g., -5 to reduce by 5dB, +3 to boost by 3dB)" },
        osc1Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 1 waveform" },
        osc1Octave: { type: "number", description: "Osc 1 octave shift in semitones (-24 to +24)" },
        osc1Detune: { type: "number", description: "Osc 1 fine tune (-50 to +50)" },
        osc1Level: { type: "number", description: "Osc 1 level 0-100" },
        osc2Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 2 waveform" },
        osc2Octave: { type: "number", description: "Osc 2 octave shift in semitones (-24 to +24)" },
        osc2Detune: { type: "number", description: "Osc 2 fine tune (-50 to +50). 5-10 adds fatness" },
        osc2Level: { type: "number", description: "Osc 2 level 0-100" },
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 400=warm, 1200=present, 4000=bright" },
        filterResonance: { type: "number", description: "Filter resonance 0-100. Adds bite at 40-60" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth -100 to +100. Positive opens filter on attack" },
        filterAttack: { type: "number", description: "Filter envelope attack 0-100" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100. Short (10-40) for plucky bass" },
        filterSustain: { type: "number", description: "Filter envelope sustain 0-100" },
        filterRelease: { type: "number", description: "Filter envelope release 0-100" },
        ampAttack: { type: "number", description: "Amp envelope attack 0-100. 0 for punchy" },
        ampDecay: { type: "number", description: "Amp envelope decay 0-100" },
        ampSustain: { type: "number", description: "Amp envelope sustain 0-100. 50-80 for bass" },
        ampRelease: { type: "number", description: "Amp envelope release 0-100. 10-30 for tight bass" },
        drive: { type: "number", description: "Output saturation 0-100. Adds harmonics and grit" }
      },
      required: []
    }
  },
  {
    name: "list_jb202_kits",
    description: "List available JB202 sound presets (kits). JB202 uses custom DSP for cross-platform consistency.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb202_kit",
    description: "Load a JB202 kit (sound preset). Applies oscillator, filter, envelope, and drive settings.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID or name (e.g., 'default', 'acid', 'sub')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_jb202_sequences",
    description: "List available JB202 pattern presets (sequences).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb202_sequence",
    description: "Load a JB202 sequence (pattern preset). Applies the note pattern with gates, accents, and slides.",
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
    description: "Add JB01 drum pattern (reference drum machine). 8 voices: kick, snare, clap, ch (closed hat), oh (open hat), lowtom, hitom, cymbal. Pass step arrays [0,4,8,12] for each voice. Use clear:true when creating a fresh pattern (e.g., for song mode variations).",
    input_schema: {
      type: "object",
      properties: {
        clear: { type: "boolean", description: "Clear ALL voices first before adding. Use this when creating a fresh pattern for song mode." },
        bars: { type: "number", description: "Pattern length in bars (default 1). Use for multi-bar patterns." },
        kick: { type: "array", items: { type: "number" }, description: "Kick steps (0-15 for 1 bar)" },
        snare: { type: "array", items: { type: "number" }, description: "Snare steps (0-15 for 1 bar)" },
        clap: { type: "array", items: { type: "number" }, description: "Clap steps (0-15 for 1 bar)" },
        ch: { type: "array", items: { type: "number" }, description: "Closed hi-hat steps (0-15 for 1 bar)" },
        oh: { type: "array", items: { type: "number" }, description: "Open hi-hat steps (0-15 for 1 bar)" },
        lowtom: { type: "array", items: { type: "number" }, description: "Low tom steps (0-15 for 1 bar)" },
        hitom: { type: "array", items: { type: "number" }, description: "Hi tom steps (0-15 for 1 bar)" },
        cymbal: { type: "array", items: { type: "number" }, description: "Cymbal steps (0-15 for 1 bar)" }
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
        voice: { type: "string", enum: ["kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"], description: "Voice to tweak (required)" },
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
  // JT10 (Lead/Bass Synth - 101-style)
  {
    name: "add_jt10",
    description: "Add a lead pattern using JT10 (101-style lead synth). Features PolyBLEP oscillators, sub-oscillator, Moog ladder filter, LFO modulation.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C3', gate: true, accent: false, slide: false}. Lead range: C2-C5",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C2, D3, E4, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra attack" },
              slide: { type: "boolean", description: "Glide/portamento to this note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_jt10",
    description: "Adjust JT10 lead synth parameters. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute lead (sets level to 0)" },
        level: { type: "number", description: "Output level 0-100" },
        waveform: { type: "string", enum: ["sawtooth", "pulse"], description: "Oscillator waveform" },
        pulseWidth: { type: "number", description: "Pulse width 0-100 (pulse waveform only)" },
        subLevel: { type: "number", description: "Sub-oscillator level 0-100" },
        subOctave: { type: "number", description: "Sub-oscillator octave (-1 or -2)" },
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000)" },
        filterResonance: { type: "number", description: "Filter resonance 0-100" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth 0-100" },
        filterAttack: { type: "number", description: "Filter envelope attack 0-100" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100" },
        filterSustain: { type: "number", description: "Filter envelope sustain 0-100" },
        filterRelease: { type: "number", description: "Filter envelope release 0-100" },
        ampAttack: { type: "number", description: "Amp envelope attack 0-100" },
        ampDecay: { type: "number", description: "Amp envelope decay 0-100" },
        ampSustain: { type: "number", description: "Amp envelope sustain 0-100" },
        ampRelease: { type: "number", description: "Amp envelope release 0-100" },
        lfoRate: { type: "number", description: "LFO rate 0-100" },
        lfoAmount: { type: "number", description: "LFO modulation amount 0-100" },
        lfoDestination: { type: "string", enum: ["pitch", "filter", "pulseWidth"], description: "LFO destination" }
      },
      required: []
    }
  },
  // JT30 (Acid Bass - 303-style)
  {
    name: "add_jt30",
    description: "Add an acid bass pattern using JT30 (303-style acid synth). Features saw/square oscillators, Moog ladder filter, classic acid sound.",
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
              accent: { type: "boolean", description: "Accent for harder attack and filter opening" },
              slide: { type: "boolean", description: "Glide/portamento to this note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_jt30",
    description: "Adjust JT30 acid bass parameters. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute bass (sets level to 0)" },
        level: { type: "number", description: "Output level 0-100" },
        waveform: { type: "string", enum: ["sawtooth", "square"], description: "Oscillator waveform" },
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 300=deep, 800=present, 2000=bright" },
        filterResonance: { type: "number", description: "Filter resonance 0-100. Classic acid squelch at 60-80" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth 0-100. Higher = more acid" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100. Short for punchy, long for sweep" },
        accentLevel: { type: "number", description: "Accent intensity 0-100" },
        drive: { type: "number", description: "Output saturation 0-100" }
      },
      required: []
    }
  },
  // JT90 (Drum Machine - 909-style)
  {
    name: "add_jt90",
    description: "Add JT90 drum pattern (909-style drum machine). 11 voices: kick, snare, clap, rimshot, lowtom, midtom, hitom, ch (closed hat), oh (open hat), crash, ride. Pass step arrays [0,4,8,12] for each voice.",
    input_schema: {
      type: "object",
      properties: {
        clear: { type: "boolean", description: "Clear ALL voices first before adding" },
        bars: { type: "number", description: "Pattern length in bars (default 1)" },
        kick: { type: "array", items: { type: "number" }, description: "Kick steps (0-15 for 1 bar)" },
        snare: { type: "array", items: { type: "number" }, description: "Snare steps (0-15 for 1 bar)" },
        clap: { type: "array", items: { type: "number" }, description: "Clap steps (0-15 for 1 bar)" },
        rimshot: { type: "array", items: { type: "number" }, description: "Rimshot steps (0-15 for 1 bar)" },
        lowtom: { type: "array", items: { type: "number" }, description: "Low tom steps (0-15 for 1 bar)" },
        midtom: { type: "array", items: { type: "number" }, description: "Mid tom steps (0-15 for 1 bar)" },
        hitom: { type: "array", items: { type: "number" }, description: "Hi tom steps (0-15 for 1 bar)" },
        ch: { type: "array", items: { type: "number" }, description: "Closed hi-hat steps (0-15 for 1 bar)" },
        oh: { type: "array", items: { type: "number" }, description: "Open hi-hat steps (0-15 for 1 bar)" },
        crash: { type: "array", items: { type: "number" }, description: "Crash cymbal steps (0-15 for 1 bar)" },
        ride: { type: "array", items: { type: "number" }, description: "Ride cymbal steps (0-15 for 1 bar)" }
      },
      required: []
    }
  },
  {
    name: "tweak_jt90",
    description: "Adjust JT90 drum voice parameters. UNITS: level 0-100, tune in cents (-1200 to +1200), decay/attack/tone 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        voice: { type: "string", enum: ["kick", "snare", "clap", "rimshot", "lowtom", "midtom", "hitom", "ch", "oh", "crash", "ride"], description: "Voice to tweak (required)" },
        mute: { type: "boolean", description: "Mute voice (sets level to 0)" },
        level: { type: "number", description: "Volume 0-100" },
        tune: { type: "number", description: "Pitch in cents (-1200 to +1200)" },
        decay: { type: "number", description: "Decay time 0-100" },
        attack: { type: "number", description: "Attack/click amount 0-100 (kick only)" },
        tone: { type: "number", description: "Tone/brightness 0-100" },
        snappy: { type: "number", description: "Snare snappiness 0-100 (snare only)" }
      },
      required: ["voice"]
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
        voice: { type: "string", description: "Voice to route (e.g., 'kick', 'snare', 'ch', 'oh', 'jb202', 'sampler')" },
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
        channel: { type: "string", enum: ["jb01", "jb202", "sampler", "kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"], description: "Instrument or JB01 voice to add effect to" },
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
        channel: { type: "string", enum: ["jb01", "jb202", "sampler", "kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"], description: "Instrument or JB01 voice to remove effect from" },
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
        target: { type: "string", description: "What to duck (e.g., 'jb202', 'sampler')" },
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
    description: "Analyze a rendered WAV file. Returns levels, frequency balance, sidechain detection, and mix recommendations. Requires sox (brew install sox).",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to analyze (defaults to last rendered)" },
        spectrogram: { type: "boolean", description: "Generate a spectrogram image (default: false)" }
      },
      required: []
    }
  },
  {
    name: "detect_waveform",
    description: "Detect the waveform type of a WAV file. Identifies sawtooth, square, triangle, or sine waves. Useful for verifying synthesizer output.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to analyze (defaults to last rendered)" }
      },
      required: []
    }
  },
  {
    name: "verify_waveform",
    description: "Verify that a WAV file contains the expected waveform type. Returns pass/fail with confidence score.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to verify (defaults to last rendered)" },
        expected: { type: "string", enum: ["sawtooth", "square", "triangle", "sine", "saw"], description: "Expected waveform type" }
      },
      required: ["expected"]
    }
  },
  {
    name: "generate_spectrogram",
    description: "Generate a spectrogram image from a WAV file. Requires sox (brew install sox).",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        output: { type: "string", description: "Output path for spectrogram PNG (defaults to <filename>-spectrogram.png)" }
      },
      required: []
    }
  },
  {
    name: "check_sox",
    description: "Check if sox (audio analysis tool) is installed. Required for audio analysis features.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "detect_resonance",
    description: "Detect filter resonance peaks (squelch detection). Identifies if a sound has prominent resonance - the characteristic 'squelch' of acid bass. Returns whether squelchy, resonance peaks, and their prominence in dB.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        minProminence: { type: "number", description: "Minimum prominence in dB to count as resonance (default: 6)" },
        minFreq: { type: "number", description: "Minimum frequency to check in Hz (default: 200)" },
        maxFreq: { type: "number", description: "Maximum frequency to check in Hz (default: 4000)" }
      },
      required: []
    }
  },
  {
    name: "detect_mud",
    description: "Detect frequency buildup in the 'mud zone' (200-600Hz). Analyzes narrow frequency bands to identify where low-mid frequencies are building up and making the mix muddy. Returns which frequencies need cutting.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        startHz: { type: "number", description: "Start frequency for analysis (default: 200)" },
        endHz: { type: "number", description: "End frequency for analysis (default: 600)" },
        bandwidthHz: { type: "number", description: "Width of each analysis band in Hz (default: 50)" }
      },
      required: []
    }
  },
  {
    name: "measure_spectral_flux",
    description: "Measure how much the spectrum changes over time. High flux indicates filter sweeps and movement - the 'acid' character. Low flux means static, non-moving sound.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        windowMs: { type: "number", description: "Analysis window size in milliseconds (default: 100)" },
        freqLow: { type: "number", description: "Low frequency bound in Hz (default: 200)" },
        freqHigh: { type: "number", description: "High frequency bound in Hz (default: 2000)" }
      },
      required: []
    }
  },
  {
    name: "get_spectral_peaks",
    description: "Find the dominant frequencies in the spectrum. Returns the loudest frequency peaks with their musical note names, amplitudes, and cents deviation from perfect pitch.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        minFreq: { type: "number", description: "Minimum frequency to consider in Hz (default: 20)" },
        maxFreq: { type: "number", description: "Maximum frequency to consider in Hz (default: 8000)" },
        minPeakDb: { type: "number", description: "Minimum amplitude for peaks in dB (default: -40)" },
        maxPeaks: { type: "number", description: "Maximum number of peaks to return (default: 10)" }
      },
      required: []
    }
  },
  {
    name: "show_spectrum",
    description: "Display a full-range ASCII spectrum analyzer visualization, like an EQ plugin. Shows energy across 8 frequency bands from Sub (20Hz) to Air (20kHz) as a vertical bar graph.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" }
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
        target: { type: "string", description: "Target for effect: instrument (jb01, jb202), voice (jb01.ch, jb01.kick, jb01.snare), or 'master'" },
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
    description: "Save current instrument settings as a user preset. Works for any instrument (jb01, jb202, sampler). Presets are stored in ~/Documents/Jambot/presets/.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler"], description: "Which instrument to save preset for" },
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
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler"], description: "Which instrument to load preset for" },
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
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler"], description: "Filter by instrument (optional, shows all if omitted)" }
      },
      required: []
    }
  },
  // === GENERIC PARAMETER TOOLS (Unified System) ===
  {
    name: "get_param",
    description: "Get any parameter value via unified path. Works for ALL instruments and parameters. Examples: 'jb01.kick.decay' → 37, 'jb202.filterCutoff' → 2000, 'sampler.s1.level' → 0",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'jb01.kick.decay', 'jb202.filterCutoff', 'sampler.s1.level')" }
      },
      required: ["path"]
    }
  },
  {
    name: "tweak",
    description: "Set any parameter value via unified path. Use 'value' for absolute values, 'delta' for relative adjustments (e.g., 'lower by 5'). Examples: tweak({path:'jb202.level',value:50}) sets to 50, tweak({path:'jb202.level',delta:-5}) reduces by 5.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'jb01.kick.decay', 'jb202.filterCutoff', 'sampler.s1.level')" },
        value: { type: "number", description: "Absolute value to set" },
        delta: { type: "number", description: "Relative adjustment (positive to increase, negative to decrease). Use this for 'increase by X' or 'reduce by X' requests." }
      },
      required: ["path"]
    }
  },
  {
    name: "tweak_multi",
    description: "Set multiple parameters at once via unified paths.",
    input_schema: {
      type: "object",
      properties: {
        params: { type: "object", description: "Object mapping paths to values, e.g., { 'jb01.kick.decay': 50, 'jb202.filterCutoff': 2000 }" }
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
        node: { type: "string", description: "Node to list params for (jb01, jb202, sampler). Omit to list all available nodes." }
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
        node: { type: "string", description: "Node to get state for (jb01, jb202, sampler)" },
        voice: { type: "string", description: "Optional: filter to specific voice (e.g., 'kick', 'snare')" }
      },
      required: ["node"]
    }
  },
  // === JP9000 MODULAR SYNTH ===
  {
    name: "add_jp9000",
    description: "Initialize the JP9000 modular synthesizer. Optionally load a preset patch (basic, pluck, dualBass) or start empty.",
    input_schema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: ["basic", "pluck", "dualBass", "empty"], description: "Preset patch to load. 'basic' = osc->filter->vca with envelope on filter+vca (full synth voice), 'pluck' = Karplus-Strong string->filter->drive (NO envelope - static filter, add env-adsr and connect to filter1.cutoffCV for filter movement), 'dualBass' = dual osc bass with envelope. Default: empty" }
      },
      required: []
    }
  },
  {
    name: "add_module",
    description: "Add a module to the JP9000 rack. Available types: osc-saw, osc-square, osc-triangle, string (Karplus-Strong), filter-lp24, filter-biquad, env-adsr, sequencer, vca, mixer, drive.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["osc-saw", "osc-square", "osc-triangle", "string", "filter-lp24", "filter-biquad", "env-adsr", "sequencer", "vca", "mixer", "drive"], description: "Module type to add" },
        id: { type: "string", description: "Custom ID for the module (optional, auto-generated if not provided)" }
      },
      required: ["type"]
    }
  },
  {
    name: "remove_module",
    description: "Remove a module from the JP9000 rack.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module ID to remove" }
      },
      required: ["id"]
    }
  },
  {
    name: "connect_modules",
    description: "Connect two module ports in the JP9000. Format: 'moduleId.portName'. COMMON PATCHES: Audio routing: 'osc1.audio'->'filter1.audio'->'vca1.audio'. Filter envelope: 'env1.cv'->'filter1.cutoffCV' (then set filter1.envAmount). VCA envelope: 'env1.cv'->'vca1.cv'. Envelopes auto-trigger on pattern notes.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source port (e.g., 'osc1.audio', 'env1.cv', 'string1.audio')" },
        to: { type: "string", description: "Destination port (e.g., 'filter1.audio', 'filter1.cutoffCV', 'vca1.cv')" }
      },
      required: ["from", "to"]
    }
  },
  {
    name: "disconnect_modules",
    description: "Disconnect two module ports in the JP9000.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source port to disconnect" },
        to: { type: "string", description: "Destination port to disconnect" }
      },
      required: ["from", "to"]
    }
  },
  {
    name: "set_jp9000_output",
    description: "Set which module is the final output of the JP9000 rack.",
    input_schema: {
      type: "object",
      properties: {
        module: { type: "string", description: "Module ID to use as output" },
        port: { type: "string", description: "Output port name (default: 'audio')" }
      },
      required: ["module"]
    }
  },
  {
    name: "tweak_module",
    description: "Adjust a parameter on a JP9000 module. PARAMS BY TYPE: osc-* (frequency, octave, detune), filter-* (cutoff 20-16000Hz, resonance 0-100, envAmount -100 to +100 - REQUIRES env connected to cutoffCV), env-adsr (attack/decay/sustain/release 0-100), string (decay, brightness, pluckPosition), drive (amount, type, mix), vca (gain), mixer (gain1-4). NOTE: filter envAmount only works if an envelope CV is connected to the filter's cutoffCV input.",
    input_schema: {
      type: "object",
      properties: {
        module: { type: "string", description: "Module ID" },
        param: { type: "string", description: "Parameter name" },
        value: { type: "number", description: "New value" }
      },
      required: ["module", "param", "value"]
    }
  },
  {
    name: "pluck_string",
    description: "Pluck a JP9000 string module at a specific note. The string module uses Karplus-Strong physical modeling for realistic plucked string sounds.",
    input_schema: {
      type: "object",
      properties: {
        module: { type: "string", description: "String module ID (e.g., 'string1')" },
        note: { type: "string", description: "Note to pluck (e.g., 'E2', 'A3')" },
        velocity: { type: "number", description: "Pluck velocity 0-1 (default: 1)" }
      },
      required: ["module", "note"]
    }
  },
  {
    name: "add_jp9000_pattern",
    description: "Set a melodic pattern for the JP9000. Each step has note, gate, accent, velocity. Pattern triggers the modules set via set_trigger_modules.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, velocity: 1}",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C1, D2, E2, etc)" },
              gate: { type: "boolean", description: "true = trigger, false = rest" },
              accent: { type: "boolean", description: "Accent for dynamics" },
              velocity: { type: "number", description: "Velocity 0-1" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "set_trigger_modules",
    description: "Set which JP9000 modules should be triggered by the pattern sequencer.",
    input_schema: {
      type: "object",
      properties: {
        modules: {
          type: "array",
          items: { type: "string" },
          description: "Array of module IDs to trigger (e.g., ['osc1', 'string1'])"
        }
      },
      required: ["modules"]
    }
  },
  {
    name: "show_jp9000",
    description: "Show the current JP9000 rack configuration: all modules, connections, and parameters.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "list_module_types",
    description: "List all available JP9000 module types with descriptions.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // === JP9000 RIG MANAGEMENT ===
  {
    name: "save_jp9000_rig",
    description: "Save the current JP9000 rack configuration as a named rig for later recall.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the rig (e.g., 'dark-bass', 'plucky-lead')" },
        description: { type: "string", description: "Optional description of the sound/purpose" }
      },
      required: ["name"]
    }
  },
  {
    name: "load_jp9000_rig",
    description: "Load a previously saved JP9000 rig by name. Replaces the current rack configuration.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the rig to load" }
      },
      required: ["name"]
    }
  },
  {
    name: "list_jp9000_rigs",
    description: "List all saved JP9000 rigs available to load.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];
