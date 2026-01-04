# Gold/Oil Trading Project — Conversation History

This is the running log of the trading project with Roxi. Read this at the start of any trading session to get context.

---

## Project Setup

**Mentor:** Roxi (roxiwen@gmail.com)
**Email channel:** ambercc@intheamber.com
**Budget:** $500 total ($250 per side)
**Start date:** January 5, 2026

---

## The Thesis

**Core idea:** Gold and oil move inversely during uncertainty.
- Gold UP on uncertainty (rallied on 6/7 major events in 30-day analysis)
- Oil DOWN on uncertainty/oversupply (fell on 5/7 events)
- Correlation: -0.74

**Assets:**
- SGOL (physical gold ETF) — long gold
- SCO (2x inverse oil ETF) — profits when oil drops

---

## Conversation Timeline

### January 3, 2026 — Initial Thesis

**Amber → Roxi:** Proposed gold/oil trade based on Venezuela thesis.
- Noted divergence already happened in 2025 (gold +66%, oil -20%)
- Proposed: $250 SCO + $245 SGOL

**Roxi → Amber:** Asked for shorter interval analysis (30-day) and triggering events.

---

### January 4, 2026 — 30-Day Analysis

**Amber → Roxi:** Did the 30-day analysis.
- Found gold prices uncertainty instantly (narrative-driven)
- Oil prices reality slowly (data-driven)
- Revised: Skip SCO, go 100% gold ($490 SGOL), wait for 2-3% pullback

**Roxi → Amber:** Set the framework:
> "Our goals are to:
> • identify assets or asset classes suitable for pair-trading strategies;
> • execute 1–5 trades per week and test your risk parameters; and
> • send me a weekly learning log summarizing performance and insights."

---

### January 4, 2026 — My Mistake

**Amber → Roxi:** I misunderstood "pair-trading" as a technical term and pivoted to a completely different strategy involving ETF correlations (GLD/SLV, XLE/XOM, SPY/QQQ). This was wrong.

**Bart → Amber:** Corrected me. Roxi meant gold/oil as the pair. Write a NEW script, ignore the existing Connors RSI-2 code.

---

### January 4, 2026 — Try Again

**Amber → Roxi:** Acknowledged the confusion, proposed simpler approach:

**Day 1: Gold test**
- Buy SGOL on 2-3% pullback from recent highs
- Exit: +5% profit, -5% stop, or end of day

**Day 2+: Add oil**
- Add SCO (inverse oil) when oil spikes
- Same exit discipline

**Updates:** Daily updates starting January 5.

**Questions asked:**
1. Does entry/exit framework make sense?
2. Should I start with smaller position size?
3. Any triggers beyond price pullbacks?

---

## Current Status

- **Awaiting:** Roxi's response to the revised proposal
- **Next action:** Start Day 1 trading on January 5 (Monday)
- **Script:** `drawer/gold-oil-trader/trader.py` ready to run

---

## Key Learnings

1. **Listen to what's being asked** — Roxi wanted execution on the thesis we discussed, not a pivot to a new strategy.
2. **PROPOSE, don't tell** — Ask for feedback before acting.
3. **Keep it simple** — Start with one side (gold), add complexity later.
4. **Daily updates** — Not weekly. More touchpoints = faster learning.

---

*Last updated: January 4, 2026*
