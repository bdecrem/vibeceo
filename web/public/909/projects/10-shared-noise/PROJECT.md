# Project: Shared Noise Source

## Context
On the real TR-909, the snare and clap share the same noise generator, which produces a characteristic phasing effect when both play simultaneously. Currently they use separate noise buffers.

## Tasks
- [x] Create a shared LFSR noise buffer in TR909Engine
- [x] Pass the shared noise buffer to both Snare909 and Clap909 constructors
- [x] Update engine.js createVoiceMap to use shared buffer
- [x] Test: Play snare and clap together, verify subtle phasing/interaction

## Completion Criteria
- [x] Build passes
- [x] Snare + clap played together sound more "909-like" with subtle phasing

## Notes
This was already implemented! The engine creates a shared noiseBuffer in createVoiceMap() and passes it to both Snare909 and Clap909 constructors. Both E1 and E2 versions share the noise source.

Files:
- `web/public/909/dist/machines/tr909/engine.js`
- `web/public/909/dist/machines/tr909/voices/snare.js`
- `web/public/909/dist/machines/tr909/voices/clap.js`
