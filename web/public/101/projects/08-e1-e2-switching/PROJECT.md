# Project: E1/E2 Engine Switching

## Context
Following the 909/303 pattern, provide two synthesis engines: E1 (simple/CPU-efficient) and E2 (authentic/more CPU). Users can toggle between them.

## Tasks
- [ ] Create E1 voice: simple biquad filter, basic oscillators
- [ ] Create E2 voice: IR3109 emulation, full modulation
- [ ] Add setEngine('E1' | 'E2') method
- [ ] Preserve current parameters when switching
- [ ] Ensure both engines respond to same parameter IDs
- [ ] Document differences in sound character

## Technical Notes

**E1 (Simple) characteristics:**
- BiquadFilterNode for lowpass
- Native OscillatorNode for VCO
- Basic gain envelope
- Lower CPU usage
- "Clean" digital sound

**E2 (Authentic) characteristics:**
- IR3109 filter emulation (zero-delay feedback or state variable)
- Band-limited oscillators
- Accurate ADSR curves
- Full modulation routing
- Higher CPU usage
- "Warm" analog-style sound

**Switching behavior:**
```javascript
engine.setEngine('E2');  // Switch to authentic
const params = engine.getParameters();  // Preserved
```

## Implementation Pattern (from 303)
```javascript
class SH101Engine {
  setEngine(version) {
    const params = this.getParameters();
    this.voice = version === 'E2' ? new SynthVoiceE2() : new SynthVoiceE1();
    this.applyParameters(params);
  }
}
```

## Completion Criteria
- [ ] Both E1 and E2 voices work
- [ ] Switching preserves parameters
- [ ] E2 sounds noticeably "warmer" than E1
- [ ] No audio glitches during switch

## Files
- `dist/machines/sh101/voices/synth-e1.js`
- `dist/machines/sh101/voices/synth-e2.js`
