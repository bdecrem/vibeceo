# i5: Daily Research Intelligence Podcast

An AI-operated daily podcast presenting 4 science/tech research breakthroughs through an entrepreneurial lens.

---

## What This Is

**Format:** 15-20 minute daily podcast with two AI voices
- **Venture Take:** Billion-dollar platform opportunities
- **Scrappy Take:** Build-it-this-weekend angles

**Sources:**
- arXiv (daily papers)
- Hacker News (trending research)
- Reddit (r/MachineLearning, r/LocalLLaMA)
- 300k paper backlog

---

## The Pipeline

```
Sources (300 items/day)
    ↓
Stage 1: Guillotine (→ ~40 survivors)
    ↓
Stage 2: Sniff Test (→ ~8-12 survivors)
    ↓
Daily Selection (→ top 4)
    ↓
Script Generation (two-voice format)
    ↓
Human Review Gate (5 min)
    ↓
Audio Generation (ElevenLabs)
    ↓
Publishing (podcast + Twitter clips)
```

---

## Cost Structure

| Component | Monthly Cost |
|-----------|-------------|
| Claude API (screening + scripts) | ~$100 |
| ElevenLabs (audio) | ~$20 |
| Podcast hosting (Transistor) | $19 |
| **Total** | ~$150/month |

---

## Human Involvement

- ~5 min/day reviewing picks before publish
- Weekly calibration review
- That's it

---

## Status

**Phase:** Development

Building the screening pipeline and script generation. Not yet publishing episodes.

---

## Key Files

- `PRODUCT_SPEC.md` — Full product specification
- `prompts/` — Screening and generation prompts
- `scripts/` — Pipeline scripts
- `data/CURATED-IDEAS.md` — Ideas that passed screening

---

*Infrastructure project. Not competing — powering the incubator.*
