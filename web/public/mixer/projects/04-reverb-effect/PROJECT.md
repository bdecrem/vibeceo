# Project: Reverb Effect

## Context
Convolution reverb using native `ConvolverNode`. Short impulse responses (<1 second) for performance on mobile/Twitter webviews. Dry/wet mix control.

## Tasks
- [ ] Create `dist/effects/reverb.js`
- [ ] Source/create short impulse responses (plate, room)
- [ ] Implement dry/wet mix using parallel gain nodes
- [ ] Add presets: 'plate', 'room'
- [ ] Test performance on iPhone Safari

## Impulse Response Requirements
- **Duration**: < 1 second (ideally 0.5-0.8s)
- **Format**: WAV, 44.1kHz, mono or stereo
- **Size**: < 100KB each
- **Character**:
  - `plate.wav` — Bright, dense, EMT-style
  - `room.wav` — Natural small space, subtle

## Signal Flow
```
              ┌──→ Dry Gain ──────────┐
Input ───────┤                        ├──→ Output
              └──→ ConvolverNode ──→ Wet Gain ─┘
```

## Parameters
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `mix` | 0-1 | 0.2 | Wet/dry balance (0 = dry, 1 = wet) |
| `preset` | string | 'plate' | Which IR to use |

## Presets
```javascript
const PRESETS = {
  plate: { ir: 'plate.wav', mix: 0.15 },
  room: { ir: 'room.wav', mix: 0.2 },
};
```

## API
```javascript
const reverb = new Reverb(audioContext);
await reverb.loadImpulse('/mixer/impulses/plate.wav');
reverb.setPreset('plate');
reverb.setParameter('mix', 0.2);

// Connect
source.connect(reverb.input);
reverb.output.connect(destination);
```

## IR Sources
Options for impulse responses:
1. **Generate synthetically** — Use noise burst + decay + filtering
2. **Use free IRs** — OpenAIR project, other CC0 sources
3. **Record real spaces** — Balloon pop in bathroom

Synthetic is easiest and ensures we have exactly what we need.

## Performance Notes
- `ConvolverNode` runs on audio thread — efficient
- Short IRs (< 1s) are very light
- Load IR once, reuse across session
- Lazy-load IRs only when reverb is added

## Completion Criteria
- [ ] Plate and room IRs created/sourced
- [ ] Dry/wet mix works smoothly
- [ ] No latency issues on playback
- [ ] Performance acceptable on iPhone Safari
