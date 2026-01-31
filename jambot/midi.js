// jambot/midi.js - MIDI file generation
// Exports patterns to standard MIDI format for DAW import

import { writeFileSync } from 'fs';

// === MIDI CONSTANTS ===
const HEADER_CHUNK = 'MThd';
const TRACK_CHUNK = 'MTrk';
const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const END_OF_TRACK = [0x00, 0xFF, 0x2F, 0x00];

// GM Drum Map (channel 10)
const GM_DRUM_MAP = {
  kick: 36,      // Bass Drum 1
  snare: 38,     // Acoustic Snare
  clap: 39,      // Hand Clap
  ch: 42,        // Closed Hi-Hat
  oh: 46,        // Open Hi-Hat
  ltom: 45,      // Low Tom
  mtom: 47,      // Mid Tom
  htom: 50,      // High Tom
  rimshot: 37,   // Side Stick
  crash: 49,     // Crash Cymbal 1
  ride: 51,      // Ride Cymbal 1
};

// === HELPER FUNCTIONS ===

// Write variable-length quantity (MIDI delta time encoding)
function writeVLQ(value) {
  if (value === 0) return [0];

  const bytes = [];
  let v = value;

  bytes.unshift(v & 0x7F);
  v >>= 7;

  while (v > 0) {
    bytes.unshift((v & 0x7F) | 0x80);
    v >>= 7;
  }

  return bytes;
}

// Convert note name to MIDI note number
function noteNameToMidi(note) {
  const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
  const match = note.match(/^([A-G])([#b]?)(\d+)$/);
  if (!match) return 60; // Default to middle C

  let n = noteMap[match[1]];
  if (match[2] === '#') n += 1;
  if (match[2] === 'b') n -= 1;
  const octave = parseInt(match[3]);

  return n + (octave + 1) * 12;
}

// Write 16-bit big-endian
function writeInt16(value) {
  return [(value >> 8) & 0xFF, value & 0xFF];
}

// Write 32-bit big-endian
function writeInt32(value) {
  return [
    (value >> 24) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 8) & 0xFF,
    value & 0xFF
  ];
}

// === MIDI FILE GENERATION ===

// Generate MIDI header chunk
function generateHeader(format, numTracks, ppq = 96) {
  const data = [
    ...HEADER_CHUNK.split('').map(c => c.charCodeAt(0)),
    ...writeInt32(6),           // Header length
    ...writeInt16(format),      // Format (0=single, 1=multi-track)
    ...writeInt16(numTracks),   // Number of tracks
    ...writeInt16(ppq),         // Pulses per quarter note
  ];
  return data;
}

// Generate tempo meta event (microseconds per beat)
function tempoEvent(bpm) {
  const uspb = Math.round(60000000 / bpm);
  return [
    0x00,                       // Delta time
    0xFF, 0x51, 0x03,          // Tempo meta event
    (uspb >> 16) & 0xFF,
    (uspb >> 8) & 0xFF,
    uspb & 0xFF,
  ];
}

// Generate track name meta event
function trackNameEvent(name) {
  const nameBytes = name.split('').map(c => c.charCodeAt(0));
  return [
    0x00,                       // Delta time
    0xFF, 0x03,                // Track name meta event
    nameBytes.length,
    ...nameBytes,
  ];
}

// Generate a track chunk from events
function generateTrack(events) {
  const trackData = [...events, ...END_OF_TRACK];
  const length = trackData.length;

  return [
    ...TRACK_CHUNK.split('').map(c => c.charCodeAt(0)),
    ...writeInt32(length),
    ...trackData,
  ];
}

// === PATTERN TO MIDI CONVERSION ===

// Convert drum pattern to MIDI events
function drumPatternToMidi(drumPattern, bars = 2, ppq = 96) {
  const events = [];
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const ticksPerStep = ppq / 4; // 16th notes

  // Collect all hits with their timing
  const hits = [];

  for (let i = 0; i < totalSteps; i++) {
    const step = i % 16;

    for (const [voice, pattern] of Object.entries(drumPattern)) {
      if (pattern[step]?.velocity > 0) {
        const midiNote = GM_DRUM_MAP[voice] || 36;
        const velocity = Math.round(pattern[step].velocity * 127);
        hits.push({
          tick: i * ticksPerStep,
          note: midiNote,
          velocity,
          duration: ticksPerStep / 2, // Short duration for drums
        });
      }
    }
  }

  // Sort by tick
  hits.sort((a, b) => a.tick - b.tick);

  // Convert to MIDI events with delta times
  let lastTick = 0;
  for (const hit of hits) {
    const delta = hit.tick - lastTick;

    // Note on (channel 10 = 0x99)
    events.push(...writeVLQ(delta));
    events.push(0x99, hit.note, hit.velocity);

    // Note off
    events.push(...writeVLQ(hit.duration));
    events.push(0x89, hit.note, 0);

    lastTick = hit.tick + hit.duration;
  }

  return events;
}

// Convert melodic pattern to MIDI events
function melodicPatternToMidi(pattern, channel = 0, bars = 2, ppq = 96) {
  const events = [];
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const ticksPerStep = ppq / 4;

  const hits = [];

  for (let i = 0; i < totalSteps; i++) {
    const step = i % 16;
    const stepData = pattern[step];

    if (stepData?.gate) {
      const midiNote = noteNameToMidi(stepData.note);
      const velocity = stepData.accent ? 120 : 90;

      // Find duration (until next rest or end)
      let duration = ticksPerStep;
      if (stepData.slide) {
        // Slides extend to next note
        for (let j = step + 1; j < 16; j++) {
          if (!pattern[j]?.gate) break;
          duration += ticksPerStep;
          if (!pattern[j]?.slide) break;
        }
      }

      hits.push({
        tick: i * ticksPerStep,
        note: midiNote,
        velocity,
        duration,
      });
    }
  }

  // Convert to MIDI events
  let lastTick = 0;
  for (const hit of hits) {
    const delta = hit.tick - lastTick;

    // Note on
    events.push(...writeVLQ(delta));
    events.push(NOTE_ON | channel, hit.note, hit.velocity);

    // Note off
    events.push(...writeVLQ(hit.duration));
    events.push(NOTE_OFF | channel, hit.note, 0);

    lastTick = hit.tick + hit.duration;
  }

  return events;
}

// === PUBLIC API ===

// Generate JB01 drums MIDI file
export function generateJB01Midi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;

  // Get JB01 pattern (session.jb01Pattern or session.drumPattern both work)
  const pattern = session.jb01Pattern || session.drumPattern || {};

  const trackEvents = [
    ...trackNameEvent('JB01 Drums'),
    ...tempoEvent(session.bpm),
    ...drumPatternToMidi(pattern, bars, ppq),
  ];

  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents),
  ];

  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}

// Generate JB202 bass MIDI file
export function generateJB202Midi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;

  // Get JB200 pattern (session.jb200Pattern or session.bassPattern both work)
  const pattern = session.jb200Pattern || session.bassPattern || [];

  const trackEvents = [
    ...trackNameEvent('JB200 Bass'),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(pattern, 0, bars, ppq),
  ];

  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents),
  ];

  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}

// Generate drums MIDI file (legacy - uses session.drumPattern which points to JB01)
export function generateDrumsMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;

  const trackEvents = [
    ...trackNameEvent('JB01 Drums'),
    ...tempoEvent(session.bpm),
    ...drumPatternToMidi(session.drumPattern || {}, bars, ppq),
  ];

  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents),
  ];

  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}

// Generate bass MIDI file
export function generateBassMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;

  const trackEvents = [
    ...trackNameEvent('Bass'),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(session.bassPattern || [], 0, bars, ppq),
  ];

  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents),
  ];

  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}

// Generate lead MIDI file
export function generateLeadMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;

  const trackEvents = [
    ...trackNameEvent('Lead'),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(session.leadPattern || [], 1, bars, ppq),
  ];

  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents),
  ];

  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}

// Generate combined MIDI file with all instruments
export function generateFullMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;

  // Track 0: Tempo track
  const tempoTrack = [
    ...trackNameEvent(session.name || 'Jambot Export'),
    ...tempoEvent(session.bpm),
  ];

  // Track 1: JB01 Drums (channel 10)
  const jb01Track = [
    ...trackNameEvent('JB01 Drums'),
    ...drumPatternToMidi(session.jb01Pattern || session.drumPattern || {}, bars, ppq),
  ];

  // Track 2: JB200 Bass (channel 1)
  const jb200Track = [
    ...trackNameEvent('JB200 Bass'),
    ...melodicPatternToMidi(session.jb200Pattern || [], 0, bars, ppq),
  ];

  // Track 3: JT90 Drums (channel 10 - shares with JB01)
  const jt90Pattern = session._nodes?.jt90?.getPattern?.() || {};
  const jt90Track = [
    ...trackNameEvent('JT90 Drums'),
    ...drumPatternToMidi(jt90Pattern, bars, ppq),
  ];

  // Track 4: JT30 Bass (channel 2)
  const jt30Pattern = session._nodes?.jt30?.getPattern?.() || [];
  const jt30Track = [
    ...trackNameEvent('JT30 Bass'),
    ...melodicPatternToMidi(jt30Pattern, 1, bars, ppq),
  ];

  // Track 5: JT10 Lead (channel 3)
  const jt10Pattern = session._nodes?.jt10?.getPattern?.() || [];
  const jt10Track = [
    ...trackNameEvent('JT10 Lead'),
    ...melodicPatternToMidi(jt10Pattern, 2, bars, ppq),
  ];

  const midiData = [
    ...generateHeader(1, 6, ppq), // Format 1, 6 tracks (tempo + 5 instruments)
    ...generateTrack(tempoTrack),
    ...generateTrack(jb01Track),
    ...generateTrack(jb200Track),
    ...generateTrack(jt90Track),
    ...generateTrack(jt30Track),
    ...generateTrack(jt10Track),
  ];

  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}

// Check if pattern has any content
export function hasContent(session) {
  // JB01 drums - check if any voice has hits
  const jb01Pattern = session.jb01Pattern || session.drumPattern || {};
  const hasJB01 = Object.values(jb01Pattern).some(voice =>
    Array.isArray(voice) && voice.some(step => step?.velocity > 0)
  );

  // JB200 bass
  const jb200Pattern = session.jb200Pattern || [];
  const hasJB200 = Array.isArray(jb200Pattern) && jb200Pattern.some(s => s?.gate);

  // JT90 drums
  const jt90Pattern = session._nodes?.jt90?.getPattern?.() || {};
  const hasJT90 = Object.values(jt90Pattern).some(voice =>
    Array.isArray(voice) && voice.some(step => step?.velocity > 0)
  );

  // JT30 bass
  const jt30Pattern = session._nodes?.jt30?.getPattern?.() || [];
  const hasJT30 = Array.isArray(jt30Pattern) && jt30Pattern.some(s => s?.gate);

  // JT10 lead
  const jt10Pattern = session._nodes?.jt10?.getPattern?.() || [];
  const hasJT10 = Array.isArray(jt10Pattern) && jt10Pattern.some(s => s?.gate);

  return {
    hasJB01, hasJB200, hasJT90, hasJT30, hasJT10,
    any: hasJB01 || hasJB200 || hasJT90 || hasJT30 || hasJT10,
  };
}

// Legacy alias
export const generateJB200Midi = generateJB202Midi;
