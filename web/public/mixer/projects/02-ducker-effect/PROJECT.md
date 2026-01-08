# Project: Ducker Effect

## Context
Sidechain-style ducking for making the kick cut through the bass. Not a real compressor — just automated gain reduction triggered by an audio signal (kick).

## How It Works
1. Detect when trigger signal (kick) exceeds threshold
2. Rapidly reduce gain on target channel
3. Smoothly restore gain after release time

This is lighter than a real compressor and more predictable for an AI agent to use.

## Tasks
- [ ] Create `dist/effects/ducker.js`
- [ ] Implement trigger detection (envelope follower or threshold)
- [ ] Implement gain automation (attack/release curves)
- [ ] Add presets: 'tight', 'pump'
- [ ] Test with 909 kick triggering 303 bass

## Parameters
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `amount` | 0-1 | 0.5 | How much to duck (0.5 = 50% reduction) |
| `attack` | 1-50ms | 5ms | How fast gain drops |
| `release` | 50-500ms | 150ms | How fast gain recovers |
| `threshold` | 0-1 | 0.1 | Trigger sensitivity |

## Presets
```javascript
const PRESETS = {
  tight: { amount: 0.5, attack: 5, release: 100, threshold: 0.1 },
  pump: { amount: 0.7, attack: 10, release: 250, threshold: 0.1 },
};
```

## Implementation Notes
- Use `GainNode` for the ducking
- For trigger detection, either:
  - `AnalyserNode` + periodic check (simple, slight latency)
  - `AudioWorkletNode` (accurate, more complex)
- Start with AnalyserNode approach — good enough for our use case

## API
```javascript
const ducker = new Ducker(audioContext);
ducker.setTrigger(kickOutputNode);  // Connect kick to trigger input
ducker.setPreset('tight');
// OR
ducker.setParameter('amount', 0.6);
ducker.setParameter('release', 200);

// Connect in chain
bassOutput.connect(ducker.input);
ducker.output.connect(masterInput);
```

## Completion Criteria
- [ ] Ducker reduces gain when trigger fires
- [ ] Attack/release curves sound smooth
- [ ] Both presets work
- [ ] No audible clicks or artifacts
