# Project 03: Wall of Text Mode

## Context
Implement "Wall of Text" format: full-screen scrolling text over a slowly-moving background image with narrator voice synced to scroll.

## Tasks
- [ ] Task 1: Update storyboard API to return single-image mode for wall-of-text
- [ ] Task 2: Add audio generation API route (`/inspiration/api/audio`)
- [ ] Task 3: Add video generation API route (`/inspiration/api/video`)
- [ ] Task 4: Implement text scroll overlay in video generation (FFmpeg drawtext)

## Completion Criteria
- [ ] `npm run build` passes
- [ ] Wall of Text mode generates different output than Video mode
- [ ] Generated video has scrolling text synced to audio

## Notes
- Wall of Text: 1 background image, full continuous script, scrolling text
- Video mode: 2 scene images, split narration, Ken Burns + crossfade
- Use FFmpeg drawtext filter for text scroll
- Sync scroll speed to audio duration
