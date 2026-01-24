/**
 * JB202 Note/Frequency Utilities
 * MIDI and note name conversions
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_MAP = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11, 'B#': 0
};

// A4 = 440Hz, MIDI note 69
const A4_MIDI = 69;
const A4_FREQ = 440;

// Convert MIDI note number to frequency
export function midiToFreq(midi) {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

// Convert frequency to MIDI note number (may be fractional)
export function freqToMidi(freq) {
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
}

// Convert note name to MIDI number (e.g., 'C4' -> 60)
export function noteToMidi(noteName) {
  if (typeof noteName === 'number') return noteName;

  const match = noteName.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) return 60; // Default to C4

  const note = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = parseInt(match[2], 10);

  const semitone = NOTE_MAP[note];
  if (semitone === undefined) return 60;

  return (octave + 1) * 12 + semitone;
}

// Convert MIDI number to note name (e.g., 60 -> 'C4')
export function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return NOTE_NAMES[semitone] + octave;
}

// Convert note name directly to frequency
export function noteToFreq(noteName) {
  return midiToFreq(noteToMidi(noteName));
}

// Transpose frequency by semitones
export function transpose(freq, semitones) {
  return freq * Math.pow(2, semitones / 12);
}

// Detune frequency by cents
export function detune(freq, cents) {
  return freq * Math.pow(2, cents / 1200);
}
