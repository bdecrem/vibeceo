# Project: E1/E2 Engine Switching

## Context
Implement the ability to switch between E1 (simple) and E2 (authentic) voice implementations, following the TR-909 pattern.

## Tasks
- [ ] Add engine version tracking to TB303Engine
- [ ] Implement setEngine() method
- [ ] Swap voice instance when engine changes
- [ ] Preserve current parameter values during swap
- [ ] Add VOICE_DEFAULTS constant (E2 is default)
- [ ] Add getVoiceEngine() / setVoiceEngine() methods
- [ ] Update parameterDescriptors after swap if needed
- [ ] Test that swap doesn't cause audio glitches

## Default Engine
```javascript
TB303Engine.VOICE_DEFAULTS = {
  bass: 'E2'  // Authentic sound is what people want from a 303
};
```

## Voice Info for Modal
```javascript
const VOICE_INFO = {
  bass: {
    e1: 'Standard oscillator with biquad lowpass. Clean, CPU-friendly.',
    e2: 'Diode ladder filter with 18dB slope. Accent boosts VCA and VCF modulation. Authentic acid squelch.',
  }
};
```

## Completion Criteria
- [ ] Can switch between E1 and E2
- [ ] Sound clearly different between engines
- [ ] No audio glitches during switch
- [ ] Parameters preserved across switch

## Files
- `dist/machines/tb303/engine.js`
