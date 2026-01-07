# Project: Clap E2

## Context
Create authentic TR-909 clap synthesis for E2 engine.

## Tasks
- [x] Research TR-909 clap circuit
- [x] Read current clap.js implementation
- [x] Implement E2 version based on research
- [x] Create clap-e1.js with original code
- [x] Update engine.js to switch clap with E1/E2
- [x] Test and compare E1 vs E2

## Completion Criteria
- [x] Build passes
- [x] E1/E2 toggle switches clap voice
- [x] E2 sounds more authentic

## Notes
File: `web/public/909/dist/machines/tr909/voices/clap.js`
E2: 4 bursts at 0/12/24/36ms + reverb tail at 44ms
Committed: 089c2f562
