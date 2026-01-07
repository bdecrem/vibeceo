# Project: Sample Playback Tuning

## Context
The real TR-909 has TUNE controls for hi-hats and cymbals that affect sample playback rate. Currently these voices lack tune parameters.

## Tasks
- [ ] Add tune parameter to HiHat909 (affects playback rate)
- [ ] Add tune parameter to Cymbal909 (affects playback rate)
- [ ] Implement playback rate adjustment in triggerSynthesis methods
- [ ] Update parameterDescriptors for both voice types
- [ ] Remove TUNE from Rimshot909 (original only has Level)
- [ ] Test: Verify hi-hats and cymbals can be pitched up/down

## Completion Criteria
- [ ] Build passes
- [ ] CH, OH, CC, RC all have working Tune knobs in UI
- [ ] Rimshot no longer shows Tune knob

## Notes
Tune should adjust BufferSourceNode.playbackRate. Range: roughly ±1 octave.
Files:
- `web/public/909/dist/machines/tr909/voices/hihat.js`
- `web/public/909/dist/machines/tr909/voices/cymbal.js`
- `web/public/909/dist/machines/tr909/voices/rimshot.js`
