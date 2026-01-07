# Project: Sample Playback Tuning

## Context
The real TR-909 has TUNE controls for hi-hats and cymbals that affect sample playback rate. Currently these voices lack tune parameters.

## Tasks
- [x] Add tune parameter to HiHat909 (affects playback rate)
- [x] Add tune parameter to Cymbal909 (affects playback rate)
- [x] Implement playback rate adjustment in triggerSynthesis methods
- [x] Update parameterDescriptors for both voice types
- [x] Remove TUNE from Rimshot909 (original only has Level)
- [x] Test: Verify hi-hats and cymbals can be pitched up/down

## Completion Criteria
- [x] Build passes
- [x] CH, OH, CC, RC all have working Tune knobs in UI
- [x] Rimshot no longer shows Tune knob

## Notes
HiHat909 and Cymbal909 already inherit tune from SampleVoice base class. Removed tune from both Rimshot909 and Rimshot909E1 since the original 909 rimshot only had Level.

Files:
- `web/public/909/dist/machines/tr909/voices/hihat.js` (inherited from SampleVoice)
- `web/public/909/dist/machines/tr909/voices/cymbal.js` (inherited from SampleVoice)
- `web/public/909/dist/machines/tr909/voices/rimshot.js` (tune removed)
- `web/public/909/dist/machines/tr909/voices/rimshot-e1.js` (tune removed)
