# Project: Testing & Tuning

## Context
Final testing pass to ensure all features work correctly and sound good. Tune parameters for authentic SH-101 character.

## Tasks
- [ ] Test all presets produce sound
- [ ] Test all parameters affect sound correctly
- [ ] Test arpeggiator all modes
- [ ] Test sequencer playback
- [ ] Test E1/E2 switching
- [ ] Test keyboard input (mouse, touch, computer keyboard)
- [ ] Test mobile responsiveness
- [ ] Test WAV export
- [ ] Tune filter resonance character
- [ ] Tune envelope curves
- [ ] Tune LFO ranges
- [ ] Compare to reference recordings if available
- [ ] Performance test (no audio glitches)
- [ ] Memory leak test (long playback)

## Testing Checklist

**Audio:**
- [ ] Sawtooth sounds correct
- [ ] Pulse sounds correct
- [ ] PWM sweeps smoothly
- [ ] Sub-oscillator tracks pitch
- [ ] All sub modes work
- [ ] Filter sweeps full range
- [ ] Resonance self-oscillates at max
- [ ] ADSR shapes are correct
- [ ] LFO modulates all targets

**UI:**
- [ ] All knobs respond to drag
- [ ] Keyboard triggers notes
- [ ] Sequencer steps highlight
- [ ] Arp mode buttons work
- [ ] Hold mode works
- [ ] Transport buttons work
- [ ] Preset dropdown works
- [ ] E1/E2 toggle works
- [ ] Info modal opens/closes

**Mobile:**
- [ ] Layout fits iPhone screen
- [ ] Touch controls work
- [ ] No accidental zoom
- [ ] Keyboard playable

**API:**
- [ ] renderPresetToWav works
- [ ] SH101Controller works
- [ ] All methods work
- [ ] WAV files play correctly

## Tuning Reference

**Compare to:**
- Roland Cloud SH-101 plugin
- TAL-BassLine-101
- YouTube videos of hardware SH-101

**Key characteristics to match:**
- Filter "smoothness" vs 303 "aggression"
- PWM shimmer quality
- Sub weight without mud
- Arpeggiator timing accuracy

## Performance Benchmarks
- Target: 60fps UI updates
- Target: No audio dropouts at 44.1kHz
- Target: <100ms latency keyboard to sound

## Completion Criteria
- [ ] All features work
- [ ] Sounds recognizably SH-101-like
- [ ] No audio glitches
- [ ] Mobile tested
- [ ] Ready for production

## Files
- All files (final verification)
