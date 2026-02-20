# MISTAKES.md — Non-Obvious Debugging Lessons

Record things here when you spend real effort debugging something non-obvious. Future sessions read this file.

## Format

```
### Short title
**Date:** YYYY-MM-DD
**Area:** project/component
**Symptom:** What you saw
**Root cause:** What was actually wrong
**Fix:** What solved it
```

---

### JT90 sample voices silently produce no sound without loadSamples()
**Date:** 2026-02-20
**Area:** JT90 / web pages + Jambot headless
**Symptom:** Hi-hats (ch, oh, crash, ride) don't play — kicks and snares work fine. Silent stubs return 0 with no error.
**Root cause:** Commit `f6a80144d` replaced synthesized cymbal voices with WAV sample playback. The engine returns silent stubs for sample voices until `loadSamples()` is called. This broke both web pages and Jambot headless rendering.
**Fix (web):** Call `await engine.loadSamples('/jt90/samples')` after creating the engine, before rendering.
**Fix (Jambot/Node.js):** Engine's `loadSamples()` uses `fetch()` which doesn't work for local files in Node. Added `loadSamplesFromDisk()` in `jt90-node.js` that reads WAVs with `readFileSync` and sets `engine._sampleData` before voices are created.
**Lesson:** When switching synthesized voices to sample-based, update ALL consumers — web pages, headless rendering, and tests. Sample loading is a separate step that silently degrades to silence if missed.

<!-- Add new entries above this line -->
