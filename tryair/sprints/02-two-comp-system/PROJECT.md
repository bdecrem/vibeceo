# Project 02: Two-Comp System

## Context
Present two creative directions (Comp A and Comp B) for user selection. Generate images for each direction in parallel and display as preview cards.

## Tasks
- [x] Task 1: Update storyboard API prompt to generate 2 creative directions
- [x] Task 2: Add image generation API route (`/inspiration/api/image`)
- [x] Task 3: Build comp selection UI with A/B preview cards
- [x] Task 4: Wire up parallel image generation for both comps
- [x] Task 5: Add "Let's discuss" button placeholder for agent mode

## Completion Criteria
- [x] `npm run build` passes
- [ ] Playwright test: Two comp cards appear with images
- [ ] User can select comp A or B

## Notes
- Image generation uses OpenAI GPT Image API
- Generate both images in parallel for speed
- Preview cards show: image, mood description, select button
- Storyboard API now returns different formats for video/wall-of-text/image modes
