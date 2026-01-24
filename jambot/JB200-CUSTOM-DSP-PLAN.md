# JB200 Custom DSP Plan

## The Problem

JB200 sounds different between web UI and Jambot, even though they share the same engine code.

**Root cause**: The engine uses Web Audio API's built-in oscillator (`osc.type = 'sawtooth'`), which is a black box. Different platforms implement it differently:
- **Browser**: Native Web Audio (Chrome/Safari/Firefox)
- **Jambot**: `node-web-audio-api` (Node.js package)

Same code, different oscillator implementations = different sound.

## The Solution

Replace platform-dependent oscillators with custom `PeriodicWave` definitions. We provide the exact harmonic coefficients, both platforms generate identical waveforms.

## Phase 1: Custom Oscillators (LOW RISK)

### What Changes

In `web/public/jb200/dist/machines/jb200/engine.js`:

**Before:**
```javascript
const osc = context.createOscillator();
osc.type = 'sawtooth';
```

**After:**
```javascript
const osc = context.createOscillator();
osc.setPeriodicWave(this.waveforms.sawtooth);
```

### Waveform Definitions

```javascript
// Generate once at engine init, reuse for all notes
function createWaveforms(context, numHarmonics = 64) {
  return {
    sawtooth: createSawtooth(context, numHarmonics),
    square: createSquare(context, numHarmonics),
    triangle: createTriangle(context, numHarmonics),
  };
}

function createSawtooth(context, n) {
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    imag[i] = 1 / i;  // sawtooth = sum of sin(n)/n
  }
  return context.createPeriodicWave(real, imag);
}

function createSquare(context, n) {
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i += 2) {
    imag[i] = 1 / i;  // square = odd harmonics only
  }
  return context.createPeriodicWave(real, imag);
}

function createTriangle(context, n) {
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i += 2) {
    const sign = ((i - 1) / 2) % 2 === 0 ? 1 : -1;
    imag[i] = sign / (i * i);  // triangle = odd harmonics at 1/n^2
  }
  return context.createPeriodicWave(real, imag);
}
```

### Files to Modify

1. `web/public/jb200/dist/machines/jb200/engine.js`
   - Add waveform generation functions
   - Create waveforms in constructor
   - Replace `osc.type = 'xxx'` with `osc.setPeriodicWave(this.waveforms.xxx)`

### Lines of Code

~30 new lines for waveform generation.

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Math errors | Very Low | Fourier series is textbook, well-documented |
| Performance | None | Still uses native Web Audio oscillator |
| Sound quality | Very Low | Same harmonics as built-in, or better |
| Aliasing | None | `createPeriodicWave` auto-band-limits |

### Testing

1. Generate test tone from web UI: `http://localhost:5173/jb200/ui/jb200/?test`
2. Generate test tone from Jambot: `test_tone` tool
3. Compare WAV files - should be identical

## Phase 2: Custom Filter (IF NEEDED)

Only do this if Phase 1 doesn't fully solve the mismatch.

### What Changes

Replace `createBiquadFilter()` with a custom filter using standard biquad coefficient formulas.

### Implementation Options

**Option A: AudioWorklet (for real-time)**
- Custom `AudioWorkletProcessor` that implements biquad math
- Runs on audio thread, good for real-time playback
- More complex setup (separate file, message passing)

**Option B: Direct buffer processing (for offline only)**
- Process samples directly when filling AudioBuffer
- Simpler, but only works for offline rendering
- Would require restructuring render path

### Biquad Math (Audio EQ Cookbook)

```javascript
// Lowpass filter coefficients
function lowpassCoeffs(freq, Q, sampleRate) {
  const w0 = 2 * Math.PI * freq / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);

  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  // Normalize
  return {
    b0: b0/a0, b1: b1/a0, b2: b2/a0,
    a1: a1/a0, a2: a2/a0
  };
}

// Apply filter (Direct Form II)
function processSample(input, coeffs, state) {
  const { b0, b1, b2, a1, a2 } = coeffs;
  const output = b0 * input + state.z1;
  state.z1 = b1 * input - a1 * output + state.z2;
  state.z2 = b2 * input - a2 * output;
  return output;
}
```

### Lines of Code

~50-80 lines for filter implementation.

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Complexity | Medium | Well-documented formulas, but more code |
| Performance | Low | Simple math, but JS vs native |
| Filter sound | Low | Standard cookbook, should match |

## Execution Plan

### Step 1: Implement Phase 1
- [ ] Add waveform generation functions to engine.js
- [ ] Create waveforms in constructor (for both real-time and offline contexts)
- [ ] Replace `osc.type` with `setPeriodicWave` in all locations:
  - `createVoice()` (real-time playback)
  - `renderNote()` (offline rendering)
  - `renderTestTone()` (test tone)
- [ ] Test with test_tone on both platforms
- [ ] Compare WAV files

### Step 2: Verify Fix
- [ ] Generate identical test tones
- [ ] Render same pattern on both platforms
- [ ] A/B comparison in DAW

### Step 3: Phase 2 (only if needed)
- [ ] Assess remaining differences
- [ ] Implement custom biquad if filter is the culprit
- [ ] Repeat verification

## Notes

- JB200 is a bass monosynth, so we need good low-frequency content
- 64 harmonics is plenty for bass (C2 = 65Hz, 64th harmonic = 4.2kHz)
- Can increase to 128 or 256 if needed for higher notes
- Triangle wave needs fewer harmonics (rolls off at 1/n^2)
