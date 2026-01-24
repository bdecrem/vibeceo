# Jambot Audio Analysis: Real Upgrade Plan

## Vision

Give Jambot **ears that can describe what they hear** in producer terms:
- "Kick fundamental: E1 (41Hz), -2 cents flat"
- "Bass: squelchy (resonance peak at 1.2kHz, 12dB above neighbors)"
- "Mud warning: 340Hz buildup, kick+bass masking"
- "Sidechain: attack 8ms, release 180ms — release is eating the next hat"

---

## Current State

The existing `analyze-node.js` provides:
- Basic stats: duration, sample rate, peak/RMS levels
- Frequency balance: 4 broad bands (20-250Hz, 250-1k, 1k-4k, 4k-20k)
- Sidechain detection: amplitude dips, pattern guess, avg ducking depth
- Waveform detection: saw/square/triangle/sine classification
- Spectrogram generation (via sox)

### Gaps

| Question | Current Answer |
|----------|----------------|
| "Is this squelchy?" | NO - can't detect resonance peaks |
| "Kick is in E?" | BARELY - no Hz→note, no percussive pitch detection |
| "Where's the mud?" | PARTIALLY - 250-1kHz too broad |
| "Sidechain timing ok?" | BARELY - no attack/release measurement |

---

## Architecture

```
jambot/effects/
  analyze-node.js          # Current (keep for basic stats)
  spectral-analyzer.js     # NEW: FFT-based analysis
  pitch-detector.js        # NEW: Pitch detection for kicks/bass
  timing-analyzer.js       # NEW: Sidechain/envelope analysis

jambot/tools/
  analyze-tools.js         # Update with new tools
```

### New Tools for Agent

| Tool | What it answers |
|------|-----------------|
| `detect_pitch` | "What note is this kick/bass?" |
| `detect_resonance` | "Is this squelchy? Where's the peak?" |
| `detect_mud` | "Where's the frequency buildup?" |
| `analyze_sidechain_timing` | "Is the attack/release right?" |
| `describe_sound` | "Describe this in producer terms" |

---

## Phase 1: Spectral Analyzer (2-3 days)

### File: `jambot/effects/spectral-analyzer.js`

```javascript
/**
 * SpectralAnalyzer - FFT-based audio analysis
 *
 * Uses sox's stat -freq or a pure JS FFT for spectral analysis.
 * Provides: spectral peaks, centroid, spread, flux.
 */

export class SpectralAnalyzer {
  constructor() {
    // FFT settings
    this.fftSize = 4096;
    this.hopSize = 1024;
  }

  /**
   * Get spectral peaks (for resonance/squelch detection)
   * @returns {Array<{freq: number, amplitude: number, note: string}>}
   */
  getSpectralPeaks(wavPath, options = {}) {
    const { minFreq = 20, maxFreq = 8000, minPeakDb = -40 } = options;
    // Extract FFT magnitudes using sox or JS FFT
    // Find local maxima above threshold
    // Convert to note names
    // Return sorted by amplitude
  }

  /**
   * Detect resonance peaks (the "squelch" in squelchy)
   * A resonance peak is a spectral peak significantly louder than neighbors
   * @returns {{ detected: boolean, freq: number, note: string, prominenceDb: number }}
   */
  detectResonance(wavPath) {
    const peaks = this.getSpectralPeaks(wavPath);
    // Find peaks that are >6dB above their neighbors
    // These indicate filter resonance
  }

  /**
   * Analyze frequency bands with narrow resolution
   * For mud detection: 50Hz-wide bands in the 200-600Hz range
   */
  analyzeNarrowBands(wavPath, options = {}) {
    const { startHz = 200, endHz = 600, bandwidthHz = 50 } = options;
    // Use sox sinc filters for each narrow band
    // Return: [{ centerFreq: 250, rmsDb: -12 }, { centerFreq: 300, rmsDb: -8 }, ...]
  }

  /**
   * Spectral flux: how much does the spectrum change over time?
   * High flux in 200-2000Hz = filter sweep = "acid" character
   */
  measureSpectralFlux(wavPath, options = {}) {
    const { windowMs = 50, freqRange = [200, 2000] } = options;
    // Divide into windows
    // Compute FFT per window
    // Measure change between adjacent windows
    // Return: { avgFlux, maxFlux, fluxOverTime: [...] }
  }
}
```

### Why This Matters

| Capability | Enables |
|------------|---------|
| `getSpectralPeaks` | "What frequencies dominate this sound?" |
| `detectResonance` | "Is this squelchy?" (yes if prominent peak) |
| `analyzeNarrowBands` | "Where's the mud?" (highest narrow band in 200-500Hz) |
| `measureSpectralFlux` | "Is the filter moving?" (high flux = acid sweep) |

### Deliverables

- [ ] `jambot/effects/spectral-analyzer.js` - Core spectral analysis class
- [ ] `detect_resonance` tool - Resonance/squelch detection
- [ ] `detect_mud` tool - Narrow-band mud detection
- [ ] Update `analyze-tools.js` with new tools
- [ ] Update `tool-definitions.js` with tool schemas

---

## Phase 2: Pitch Detector (1-2 days)

### File: `jambot/effects/pitch-detector.js`

```javascript
/**
 * PitchDetector - Fundamental frequency detection
 *
 * Uses autocorrelation or FFT peak detection to find pitch.
 * Handles both sustained tones and percussive sounds.
 */

export class PitchDetector {
  /**
   * Detect pitch of a sustained tone
   * Uses autocorrelation (good for periodic waveforms)
   */
  detectSustainedPitch(samples, sampleRate) {
    // Autocorrelation method
    // Find first major peak after zero lag
    // Convert to Hz
  }

  /**
   * Detect fundamental of a kick drum
   * Kicks have pitch envelopes - we want the "settled" pitch
   * Analyze 20-80ms window after initial transient
   */
  detectKickPitch(wavPath) {
    // Extract samples from 20-80ms (after click, before decay)
    // Find lowest significant FFT peak in 30-150Hz range
    // Return: { hz: 41.2, note: 'E1', cents: -8 }
  }

  /**
   * Detect pitch of bass notes
   * For pattern analysis: what notes are being played?
   */
  detectBassNotes(wavPath, bpm) {
    // Divide into 16th note windows
    // For each window with energy, detect pitch
    // Return: [{ step: 0, note: 'C2', hz: 65.4 }, { step: 4, note: 'E2', hz: 82.4 }, ...]
  }

  /**
   * Convert Hz to note name with cents deviation
   */
  hzToNote(hz) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const semitones = 12 * Math.log2(hz / a4);
    const roundedSemitones = Math.round(semitones);
    const cents = Math.round((semitones - roundedSemitones) * 100);
    const midiNote = 69 + roundedSemitones;
    const noteName = noteNames[((midiNote % 12) + 12) % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return { note: `${noteName}${octave}`, hz, cents, midiNote };
  }
}
```

### Deliverables

- [ ] `jambot/effects/pitch-detector.js` - Pitch detection class
- [ ] `detect_pitch` tool - Kick/bass pitch detection
- [ ] Hz→note conversion utility
- [ ] Update tools and definitions

---

## Phase 3: Timing Analyzer (2-3 days)

### File: `jambot/effects/timing-analyzer.js`

```javascript
/**
 * TimingAnalyzer - Envelope and timing analysis
 *
 * For sidechain analysis: attack time, release time, timing accuracy.
 * For transient analysis: where do hits land relative to grid?
 */

export class TimingAnalyzer {
  /**
   * Analyze sidechain compression timing
   * High-resolution amplitude envelope analysis
   */
  analyzeSidechainTiming(wavPath, bpm) {
    // Sample at 1ms resolution (not 50ms like current)
    // Find duck events (rapid amplitude drops)
    // For each duck:
    //   - Attack time: how fast does it drop?
    //   - Release time: how fast does it recover?
    //   - Timing offset: how far from beat grid?
    // Return: {
    //   avgAttackMs: 5,
    //   avgReleaseMs: 150,
    //   timingOffsetMs: 2,
    //   issues: ['release too slow - eating next transient']
    // }
  }

  /**
   * Detect sidechain artifacts
   */
  detectSidechainArtifacts(wavPath, bpm) {
    const timing = this.analyzeSidechainTiming(wavPath, bpm);
    const issues = [];

    // Attack too slow = kick transient gets through before duck
    if (timing.avgAttackMs > 10) {
      issues.push(`Attack ${timing.avgAttackMs}ms is slow — kick may punch through before duck`);
    }

    // Release too slow = next sound gets ducked
    const sixteenthMs = (60000 / bpm) / 4;
    if (timing.avgReleaseMs > sixteenthMs * 0.8) {
      issues.push(`Release ${timing.avgReleaseMs}ms may duck the next 16th note`);
    }

    // Release too fast = audible "breathing"
    if (timing.avgReleaseMs < 50) {
      issues.push(`Release ${timing.avgReleaseMs}ms is fast — may cause audible pumping`);
    }

    return { timing, issues };
  }

  /**
   * Analyze transient timing relative to grid
   */
  analyzeTransientTiming(wavPath, bpm) {
    // Detect transients (sudden amplitude increases)
    // Compare to beat grid
    // Return: { avgOffsetMs, maxOffsetMs, driftDirection: 'rushing'|'dragging'|'tight' }
  }
}
```

### Deliverables

- [ ] `jambot/effects/timing-analyzer.js` - Timing analysis class
- [ ] `analyze_sidechain_timing` tool - Attack/release measurement
- [ ] Sidechain artifact detection with actionable suggestions
- [ ] Update tools and definitions

---

## Phase 4: Sonic Vocabulary (1 week)

### File: `jambot/effects/sonic-vocabulary.js`

Maps measured characteristics to human vocabulary:
- "squelchy" = high resonance peak + filter movement
- "punchy" = fast attack + controlled sustain + low-end presence
- "muddy" = excess 250-400Hz + low clarity
- "thin" = weak fundamentals

### Deliverables

- [ ] `jambot/effects/sonic-vocabulary.js` - Vocabulary mapping
- [ ] `describe_sound` tool - Human-readable sound description
- [ ] Integration with all analyzers

---

## Implementation Order

| Phase | Deliverable | Effort | Enables |
|-------|-------------|--------|---------|
| 1 | `spectral-analyzer.js` | 2-3 days | Resonance detection, mud detection |
| 2 | `pitch-detector.js` | 1-2 days | "Kick is E1", note detection |
| 3 | `timing-analyzer.js` | 2-3 days | Sidechain timing issues |
| 4 | `sonic-vocabulary.js` | 3-5 days | "Squelchy", "punchy", etc. |

**Total: ~2 weeks for full "be the ears" capability**

---

## Example Agent Interaction (Goal State)

```
User: "make me an acid bass line"

Agent: [creates bass pattern with JB202, high resonance]
       [renders]
       [calls describe_sound({ target: 'bass' })]

Tool returns: "Bass: squelchy (resonance peak at 1.1kHz, 14dB prominence),
              filter movement detected (flux: 0.45). Notes: C2, D#2, G2."

Agent: "Done! Created a squelchy acid line with filter sweep.
        Playing C2, D#2, G2 in C minor. Want me to make it more aggressive?"
```

---

## Dependencies

- **sox**: Already required, used for bandpass filtering and stats
- **No new npm packages needed**: Using sox + raw WAV parsing (already in analyze-node.js)
