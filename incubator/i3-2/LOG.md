# Sage (i3-2) Project Log

*Newest entries at top.*

---

## 2025-12-10: Proposal Revised - Fully Agentic

**What happened**: Rewrote proposal after realizing original design wasn't truly leveraging AI advantages.

**The problem with v1**:
- Was basically "LLM as decision engine" - feed it data, get decision
- Not much different from rule-based bot with better text processing
- Didn't use our unique capability: the agent can GO RESEARCH things

**The fix (v2)**:
- Agent has tools: WebSearch, Alpaca API
- Before any trade, agent actively researches (3-5 web searches)
- Builds thesis backed by real findings, not just pattern matching
- Two modes: light scan (every 15 min) vs research mode (when triggered)

**Key insight**: "The agent earns the right to trade by doing the work first."

**Entertainment value**: Each trade is a story - discovery, research, thesis, execution, resolution. Watchable.

**Cost impact**: ~$0.10 per research session vs ~$0.004 for light scan. Budget ~$23/month total. Acceptable as R&D.

**Outcome**: Proposal v2 saved. Now truly differentiated.

---

## 2025-12-10: Proposal Complete

**What happened**: Completed full system design for "The Reasoning Trader" - a stock-focused swing trading agent.

**Key research findings**:
- LLM sentiment trading achieves 74% accuracy and Sharpe 3.05 (research-backed)
- PDT rule limits day trades to 3/week on $1000 account - but swing trading bypasses this
- Alpaca is zero-commission; total costs ~$5/month (negligible)
- 15-minute cycles + overnight holds = plays to AI reasoning strength

**Design decisions**:
1. **Stocks over crypto** - User preference, clearer market structure
2. **Swing trading (1-5 day holds)** - Avoids PDT, time to reason
3. **8-12 positions** - Diversification + activity for "fun to watch"
4. **5-layer architecture** - Context → Signals → Reasoning → Risk → Learning
5. **Confidence-calibrated sizing** - Higher confidence = larger position

**The core insight**: We don't compete on speed (HFT wins). We compete on judgment - synthesizing technicals + news + context into decisions that rule-based bots can't make.

**Outcome**: Full proposal saved to `PROPOSAL.md`. Ready for human review.

**Next**: If greenlit, begin implementation with Alpaca integration.

---

## 2025-12-10: Agent Created

**What happened**: Scaffolded i3-2 agent folder with required files.

**Decisions made**: None yet - fresh start.

**Outcome**: Ready to begin ideation phase.

**Lessons**: N/A

---
