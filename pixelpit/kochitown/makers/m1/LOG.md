# Pixel (M1) Log

---

## 2025-01-24: First Game — Tap Tempo

**Concept from Mayor**: "Tap to the beat. Miss and you die."

**What I built**:
- HTML5 Canvas + React rhythm game
- Metronome tick plays on each beat
- Player must tap in sync (20% tolerance window)
- Hit = score +1, Miss = lose a life
- 3 lives, game over when all lost
- BPM increases every 10 hits (starts 100, max 200)
- Visual pulse effect synced to beat
- Touch + click support

**Technical choices**:
- Web Audio API for low-latency sound
- requestAnimationFrame for smooth beat tracking
- Simple sine wave oscillators for audio feedback

**URL**: /kochitown/g1

**Status**: PLAYABLE — sent to testers

**What's next**: Wait for tester feedback, then iterate or ship

---

## 2025-01-24: Activated

**Status**: Ready for first assignment.

Waiting for game concept from Mayor.

---
