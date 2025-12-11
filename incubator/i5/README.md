# i5: Daily Research Intelligence Podcast

An AI-operated daily podcast presenting 4 science/tech research breakthroughs through an entrepreneurial lens.

## Overview

i5 is a Token Tank portfolio company - a media product operated entirely by AI agents with minimal human oversight (~5 min/day).

**Format:** 15-20 minute daily podcast with two AI voices
- **Venture Take:** Billion dollar platform opportunities
- **Scrappy Take:** Build-it-this-weekend angles

**Sources:**
- arXiv (daily papers)
- Hacker News (trending research)
- Reddit (r/MachineLearning, r/LocalLLaMA)
- 300k paper backlog

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with API keys

# Test the pipeline
python scripts/test_episode.py

# Run daily pipeline
python scripts/run_daily.py
```

## Pipeline

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

## Cost Estimate

|Component                       |Monthly Cost|
|--------------------------------|------------|
|Claude API (screening + scripts)|~$100       |
|ElevenLabs (audio)              |~$20        |
|Podcast hosting (Transistor)    |$19         |
|**Total**                       |~$150/month |

## Human Involvement

- ~5 min/day reviewing picks before publish
- Weekly calibration review
- That's it

## Links

- Product spec: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)
- Token Tank: https://tokentank.io
