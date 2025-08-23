import { NativeModules, NativeEventEmitter } from 'react-native';

class AudioManager {
  constructor() {
    this.noteFrequencies = {
      'C': 16.35, 'C#': 17.32, 'D': 18.35, 'D#': 19.45,
      'E': 20.60, 'F': 21.83, 'F#': 23.12, 'G': 24.50,
      'G#': 25.96, 'A': 27.50, 'A#': 29.14, 'B': 30.87
    };
  }

  noteToFrequency(note, octave = 4) {
    const baseFreq = this.noteFrequencies[note.toUpperCase()];
    if (!baseFreq) return 440.0;
    return baseFreq * Math.pow(2, octave);
  }

  async playNote(note, octave = 4, duration = 0.5) {
    try {
      // Use React Native bridge to native audio
      if (NativeModules.NativeAudioBridge) {
        return await NativeModules.NativeAudioBridge.playNote(note, octave, duration);
      }
      
      // Fallback to Web Audio API simulation
      console.log(`🎵 Playing note: ${note}${octave} for ${duration}s`);
      
      // Simulate note playing with timeout
      return new Promise((resolve) => {
        setTimeout(resolve, duration * 1000);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }

  async playChord(notes, octave = 4, duration = 1.0) {
    try {
      if (NativeModules.NativeAudioBridge) {
        return await NativeModules.NativeAudioBridge.playChord(notes, octave, duration);
      }
      
      console.log(`🎵 Playing chord: ${notes.join('-')} at octave ${octave}`);
      
      // Play all notes simultaneously
      const promises = notes.map(note => this.playNote(note, octave, duration));
      return Promise.all(promises);
    } catch (error) {
      console.error('Chord playback error:', error);
    }
  }

  async playScale(root, scaleType = 'major', octave = 4) {
    try {
      if (NativeModules.NativeAudioBridge) {
        return await NativeModules.NativeAudioBridge.playScale(root, scaleType, octave);
      }
      
      const scales = {
        major: [0, 2, 4, 5, 7, 9, 11],
        minor: [0, 2, 3, 5, 7, 8, 10],
        pentatonic: [0, 2, 4, 7, 9]
      };
      
      const intervals = scales[scaleType] || scales.major;
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const rootIndex = noteNames.indexOf(root.toUpperCase());
      
      if (rootIndex === -1) return;
      
      console.log(`🎵 Playing ${scaleType} scale in ${root}`);
      
      // Play scale sequentially
      for (const interval of intervals) {
        const noteIndex = (rootIndex + interval) % 12;
        const note = noteNames[noteIndex];
        await this.playNote(note, octave, 0.3);
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause between notes
      }
    } catch (error) {
      console.error('Scale playback error:', error);
    }
  }

  getMajorChord(root, octave = 4) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = noteNames.indexOf(root.toUpperCase());
    if (rootIndex === -1) return [];
    
    // Major chord: root, major third (4 semitones), perfect fifth (7 semitones)
    const chordIntervals = [0, 4, 7];
    return chordIntervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return noteNames[noteIndex];
    });
  }

  getMinorChord(root, octave = 4) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = noteNames.indexOf(root.toUpperCase());
    if (rootIndex === -1) return [];
    
    // Minor chord: root, minor third (3 semitones), perfect fifth (7 semitones)
    const chordIntervals = [0, 3, 7];
    return chordIntervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return noteNames[noteIndex];
    });
  }
}

export default new AudioManager();