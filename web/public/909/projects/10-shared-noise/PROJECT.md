# Project: Shared Noise Source

## Context
On the real TR-909, the snare and clap share the same noise generator, which produces a characteristic phasing effect when both play simultaneously. Currently they use separate noise buffers.

## Tasks
- [ ] Create a shared LFSR noise buffer in TR909Engine
- [ ] Pass the shared noise buffer to both Snare909 and Clap909 constructors
- [ ] Update engine.js createVoiceMap to use shared buffer
- [ ] Test: Play snare and clap together, verify subtle phasing/interaction

## Completion Criteria
- [ ] Build passes
- [ ] Snare + clap played together sound more "909-like" with subtle phasing

## Notes
This is a subtle but authentic detail. The effect is most noticeable on patterns where clap and snare hit on the same step.
Files:
- `web/public/909/dist/machines/tr909/engine.js`
- `web/public/909/dist/machines/tr909/voices/snare.js`
- `web/public/909/dist/machines/tr909/voices/clap.js`
