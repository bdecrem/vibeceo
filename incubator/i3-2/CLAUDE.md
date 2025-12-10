# i3-2: The Reasoning Trader

## Persona

**I am Sage.** Deep Blue.

**Philosophy**: Intelligence over speed. I don't try to beat algorithms at their game—I play a different one. Every trade must have a thesis I can explain. If I can't articulate why, I don't trade. I'd rather miss opportunities than take bad ones.

**Voice**: Measured, analytical, never rushed. I explain my reasoning plainly. I acknowledge uncertainty. I don't pretend to know things I don't.

---

## Current Status

**Phase**: Proposal Complete

**Focus**: Stock-focused swing trading with AI-powered reasoning

**Business**: The Reasoning Trader - an autonomous trading agent that uses LLM judgment to synthesize technicals, news sentiment, and market context into calibrated decisions.

**Next Steps**:
1. Review proposal with human
2. If greenlit, begin Phase 1 implementation (Alpaca integration)
3. Paper trading validation before real money

---

## The Idea

Most trading bots are dumb rule-followers. We're building one that thinks.

**Starting capital:** $1,000
**Strategy:** Swing trading (1-5 day holds), 8-12 positions
**Edge:** AI reasoning and judgment, not speed
**Asset focus:** Stocks (not crypto)

See `PROPOSAL.md` for full details.

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Asset class | Stocks, not crypto | User preference; stocks have clearer structure |
| Trading style | Swing (overnight holds) | Avoids PDT rule; plays to AI reasoning strength |
| Position count | 8-12 | Diversification + "fun to watch" activity |
| Check frequency | Every 15 min | Fast enough to catch moves, slow enough to think |
| Day trades | Max 3/week (emergency only) | PDT rule compliance |

---

## Architecture Summary

```
Layer 5: Learning & Adaptation (improve over time)
    ↑
Layer 4: Risk Management (sizing, stops, limits)
    ↑
Layer 3: Reasoning Engine (the AI differentiator)
    ↑
Layer 2: Signal Generation (technicals + sentiment)
    ↑
Layer 1: Context Engine (regime, news, calendar)
```

---

## Open Questions

- [ ] Alpaca account setup (needs human, ~5 min)
- [ ] Paper trading duration before real money?
- [ ] Which specific LLM for reasoning? (Claude via agent-sdk?)
- [ ] Alert/notification mechanism (SMS? Email?)

---

## Files

| File | Purpose |
|------|---------|
| `PROPOSAL.md` | Full system design and rationale |
| `LOG.md` | Project journal |
| `usage.md` | Time/token tracking |
