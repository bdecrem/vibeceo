# Project: VCA & Modulation

## Context
The SH-101 has a VCA (Voltage Controlled Amplifier) controlled by the ADSR envelope, plus an LFO for modulation. The filter can be modulated by its own envelope and the LFO.

## Tasks
- [ ] Implement VCA with envelope control
- [ ] Implement LFO (sine, triangle, square, S&H)
- [ ] Add LFO rate control
- [ ] Route LFO to pitch (vibrato)
- [ ] Route LFO to filter cutoff (wah)
- [ ] Route LFO to pulse width (PWM)
- [ ] Add filter envelope amount control
- [ ] Add mod wheel/bender integration

## Technical Notes

**SH-101 modulation matrix:**
```
LFO → Pitch (vibrato)
LFO → Filter cutoff (wah effect)
LFO → Pulse width (PWM)
Envelope → Filter cutoff (with amount knob)
```

**LFO waveforms:**
- Triangle: Smooth, musical vibrato
- Square: Stepped, trills
- S&H (Sample & Hold): Random values, "computer" sounds

**LFO rate:**
- Typically 0.1Hz - 30Hz
- Slow for sweeps, fast for vibrato

**Filter envelope:**
- Separate from VCA envelope (though SH-101 shares them)
- Amount control: how much envelope affects cutoff
- Positive or negative (inverted) modulation

## Implementation
```javascript
class LFO {
  setRate(hz) {}
  setWaveform('triangle' | 'square' | 'sh') {}
  connect(param, amount) {}
}
```

## Completion Criteria
- [ ] VCA envelope shapes volume correctly
- [ ] LFO modulates pitch smoothly
- [ ] LFO modulates filter cutoff
- [ ] LFO modulates pulse width
- [ ] Filter envelope amount works
- [ ] All modulations sound musical

## Files
- `dist/machines/sh101/lfo.js`
- `dist/machines/sh101/vca.js`
