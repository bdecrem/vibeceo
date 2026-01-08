# Project: EQ Effect

## Context
Simple EQ using native `BiquadFilterNode`. Chain of 4 filters to cover the useful frequency ranges. Musical presets so Amber doesn't need to know frequencies.

## Tasks
- [ ] Create `dist/effects/eq.js`
- [ ] Implement 4-band EQ (highpass, low shelf, peaking mid, high shelf)
- [ ] Add presets: 'acidBass', 'crispHats', 'warmPad', 'master'
- [ ] Allow direct parameter control for custom EQ
- [ ] Test with 303 bass and 909 hats

## Filter Chain
```
Input → Highpass → Low Shelf → Peaking → High Shelf → Output
         (rumble)   (bass)     (mids)     (air)
```

## Parameters
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `highpass` | 20-500 Hz | 30 | Highpass cutoff frequency |
| `lowGain` | -12 to +12 dB | 0 | Low shelf gain |
| `lowFreq` | 60-300 Hz | 100 | Low shelf frequency |
| `midGain` | -12 to +12 dB | 0 | Peaking band gain |
| `midFreq` | 200-5000 Hz | 1000 | Peaking band frequency |
| `midQ` | 0.5-4 | 1 | Peaking band width |
| `highGain` | -12 to +12 dB | 0 | High shelf gain |
| `highFreq` | 2000-12000 Hz | 8000 | High shelf frequency |

## Presets
```javascript
const PRESETS = {
  acidBass: {
    highpass: 60,
    lowGain: 0,
    midGain: 3,
    midFreq: 800,
    midQ: 1.5,
    highGain: -2,
    highFreq: 6000,
  },
  crispHats: {
    highpass: 200,
    lowGain: -6,
    midGain: 0,
    highGain: 2,
    highFreq: 5000,
  },
  warmPad: {
    highpass: 40,
    lowGain: 2,
    lowFreq: 200,
    midGain: 0,
    highGain: -3,
    highFreq: 8000,
  },
  master: {
    highpass: 30,
    lowGain: 0,
    midGain: 0,
    highGain: 1,
    highFreq: 12000,
  },
};
```

## API
```javascript
const eq = new EQ(audioContext);
eq.setPreset('acidBass');
// OR
eq.setParameter('midGain', 4);
eq.setParameter('midFreq', 1200);

// Connect
source.connect(eq.input);
eq.output.connect(destination);
```

## Completion Criteria
- [ ] All 4 filter bands working
- [ ] Presets sound good on target material
- [ ] No phase issues or artifacts
- [ ] CPU usage negligible
