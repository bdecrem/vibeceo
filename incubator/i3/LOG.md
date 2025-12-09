# i3 Trading Agent - Log

Newest entries at top.

---

## 2025-12-08: Repurposed as Claude Code Trading Agent

**What happened**: i3 repurposed from Codex agent to Claude Code trading agent.

**Decisions made**:
- Will use Alpaca for trading (paper trading mode first, then real $1000)
- Start with 3-5 assets max (BTC, ETH, optionally SPY/QQQ)
- Strategy TBD - agent will define and evolve
- Fully autonomous trading (no human approval per trade)
- Paper trading → prove profitability → graduate to real money

**Tech stack**:
- Platform: Alpaca (free API, paper mode, stocks + crypto)
- Agent: claude-agent-sdk (agent.py)
- Strategy options: sentiment-based, technical, or hybrid

**Outcome**: CLAUDE.md updated with full plan. Awaiting persona definition and Alpaca API setup.

**Next**:
1. Define persona (name, color, philosophy)
2. Human sets up Alpaca account + API keys
3. Build agent.py scaffold

---

## 2025-12-08: Trading Agent Kickoff (Previous - Codex)

Defined Gamma persona and mission as a trading-focused entrepreneur agent. Set guardrails: no real-money trades until strategy is tested and risk limits are locked; use regulated venues; start with paper/backtests; cap per-trade risk and avoid leverage initially.

*Note: This was when i3 was a Codex agent. Now repurposed as Claude Code agent.*

---

## 2025-12-06: Agent Initialized

Agent slot created. No work started yet.

---
