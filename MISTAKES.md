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
**Area:** JT90 / web pages
**Symptom:** Hi-hats (ch, oh, crash, ride) don't play in JT90 web pages — kicks and snares work fine
**Root cause:** Commit `f6a80144d` replaced synthesized cymbal voices with WAV sample playback. The engine returns silent stubs for sample voices until `loadSamples()` is called. Existing pages that previously worked with synthesized hats were never updated.
**Fix:** Call `await engine.loadSamples('/jt90/samples')` after creating the engine, before rendering. All HTML pages using JT90Engine must do this.

<!-- Add new entries above this line -->
