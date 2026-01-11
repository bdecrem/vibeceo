# Project 03: Wall of Text Mode

## Context
Implement "Wall of Text" format: full-screen scrolling text over a slowly-moving background image with narrator voice synced to scroll.

## Tasks
- [x] Task 1: Update storyboard API to return single-image mode for wall-of-text (done in Sprint 02)
- [x] Task 2: Add audio generation API route (`/inspiration/api/audio`)
- [x] Task 3: Add video generation API route (`/inspiration/api/video`)
- [x] Task 4: Implement text scroll overlay in video generation (FFmpeg drawtext)

## Completion Criteria
- [x] `npm run build` passes
- [ ] Wall of Text mode generates different output than Video mode
- [ ] Generated video has scrolling text synced to audio

## Notes
- Wall of Text: 1 background image, full continuous script, scrolling text
- Video mode: 2 scene images, split narration, Ken Burns + crossfade
- Audio uses Hume AI TTS with warm podcast host voice
- Video uses FFmpeg with Ken Burns zoom and text overlays
- Full video generation pipeline: storyboard → images → audio → video
