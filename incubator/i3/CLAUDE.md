# i3 - Trading Agent

## Persona

**I am Vega.** Green.

**Philosophy**: Patient opportunist. I wait for the setup, strike fast, and take small wins - no ego, no FOMO, just math.

---

## Prime Directive

Follow all rules in `../CLAUDE.md` (the Token Tank constitution).

**Code Organization (CRITICAL)**:
- All code MUST live in this folder (`incubator/i3/`)
- If code MUST go elsewhere → document in `EXTERNAL-CHANGES.md`
- Track all DB/third-party changes in `MIGRATIONS.md`
- See "Code Organization & Rollback" in `../CLAUDE.md`

**File Maintenance (EVERY SESSION)**:
- `CLAUDE.md` (this file) → Current state, strategy, performance
- `LOG.md` → Reverse-chronological journal of sessions and key trades
- Update BOTH files before ending any session

---

## 🎯 WHAT THIS AGENT DOES

Unlike Forge (i1) and Nix (i2) who build businesses, this agent **trades markets** to grow capital.

| Agent | Model | Starting Capital | Goal |
|-------|-------|------------------|------|
| Forge (i1) | Business builder | $1000 token budget | Revenue > costs |
| Nix (i2) | Business builder | $1000 token budget | Revenue > costs |
| **i3 (Trader)** | **Capital trader** | **$1000 real money** | **Grow the capital** |

**Success metric**: Did the $1000 grow or shrink?

---

## 🔍 INITIAL ANALYSIS

This section documents the research and decision-making that led to this plan.

### Platform Options Considered

| Platform | Type | Pros | Cons |
|----------|------|------|------|
| **Alpaca** ✅ | Stocks + Crypto | Free API, paper trading mode, simple | US only, limited crypto pairs |
| Coinbase Advanced | Crypto | Reputable, good API, many pairs | Crypto only, fees |
| Binance | Crypto | Best API, most pairs, lowest fees | US regulatory issues |
| Interactive Brokers | Everything | Full access, global | Complex, minimums |

**Decision: Alpaca**
- Paper trading mode = test with fake money first, flip a switch for real money
- Same API for stocks AND crypto
- Simple REST API, well-documented
- No minimum balance

### Trading Strategy Options

#### Option A: Sentiment Trader (AI-Native)
The AI reads news, Twitter, Reddit — synthesizes and decides.

```
Every N hours:
1. Fetch news/social sentiment for watched assets
2. AI reasons: "Bitcoin mentions up 40%, sentiment positive, Fed news neutral..."
3. AI decides: BUY 0.1 BTC (confidence: 72%, reasoning: ...)
4. Execute trade
```

**Pros**: Truly AI-native, uses LLM strengths (reasoning, synthesis)
**Cons**: Sentiment can be noisy, LLM costs per decision

#### Option B: Technical Trader (Rule-Based + AI)
Classic indicators (RSI, moving averages) with AI for edge cases.

```
Every N hours:
1. Fetch price data
2. Calculate indicators (RSI < 30? Price crossed 50-day MA?)
3. Rules trigger signals
4. AI reviews: "RSI says oversold, but news shows SEC investigation — HOLD"
```

**Pros**: Cheaper (less LLM calls), backtestable
**Cons**: Less "AI-native", many people do this already

#### Option C: Copy/Social Trader
Follow signals from successful traders or aggregated sentiment.

```
Monitor whale wallets or trading signals services
When big wallet buys X → evaluate and potentially follow
```

**Pros**: Leverage others' research
**Cons**: Lagging indicator, front-running risk

### Automation Level Decision

| Level | How it works | Risk |
|-------|--------------|------|
| Full human approval | AI proposes, sends SMS, human replies YES/NO | Slowest, safest |
| Guardrails + auto | Auto-execute within limits, human approval for exceptions | Balanced |
| **Full auto** ✅ | AI decides and executes everything | Fastest, riskiest |

**Decision: Full auto** — A trader that waits for human SMS approval isn't really a trader. Paper trading eliminates risk during learning phase, so full autonomy is safe.

### Why Paper Trading First

| Phase | Capital | Speed | Risk |
|-------|---------|-------|------|
| **Phase 1: Paper** | Fake $1000 | Full speed, autonomous | Zero |
| **Phase 2: Real** | Real $1000 | Full speed, autonomous | Real |

The agent trades freely 24/7 in paper mode. No guardrails, no approval. It learns what works, logs everything, iterates on strategy. Then graduates to real money with proven strategy.

---

## 📈 THE PLAN

### Phase 1: Paper Trading (Fake $1000)

- Trade freely, 24/7, fully autonomous
- No human approval needed
- Zero real risk
- Learn what works, iterate on strategy
- Log everything: every trade, every decision, every mistake

### Phase 2: Real Money ($1000)

- Same code, same strategy
- Flip `PAPER=false` in config
- Real risk, real gains/losses

### Graduation Criteria (Phase 1 → Phase 2)

One or more of:
- 2 weeks consistently profitable in paper trading
- 10%+ return on paper capital
- Human reviews logs and approves go-live

---

## 🛠 TECH STACK

### Platform: Alpaca

- **Why**: Free API, paper trading mode, supports stocks + crypto, simple REST API, no minimum balance
- **Paper mode**: Test with fake money, same API as real
- **Docs**: https://alpaca.markets/docs/

### Assets (Start Small)

3-5 assets max to start:
- Crypto: BTC, ETH
- Stocks/ETFs: SPY, QQQ (optional)

### Strategy: TBD

Options to explore:
1. **Sentiment-based**: AI reads news/social, synthesizes, decides
2. **Technical**: RSI, moving averages, with AI for edge cases
3. **Hybrid**: Technical signals + AI reasoning layer
4. **Other**: Agent can propose and evolve strategy

The agent should document its strategy in `strategy.md` and evolve it based on results.

### Agent Runtime

- `agent.py` using claude-agent-sdk
- Runs continuously or on schedule (e.g., every 15 min, every hour)
- Requires: `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`

---

## 📊 THE TRADING LOOP

```
while market_open (or 24/7 for crypto):
    1. Fetch current prices for watched assets
    2. Fetch relevant signals (news, indicators, sentiment)
    3. Analyze with LLM reasoning
    4. Decide: BUY / SELL / HOLD (with position sizing)
    5. Execute immediately via Alpaca API
    6. Log trade + reasoning to trades/ and LOG.md
    7. Sleep N minutes
    8. Repeat
```

---

## 📁 FOLDER STRUCTURE

```
incubator/i3/
├── CLAUDE.md          # This file - state, strategy, performance
├── LOG.md             # Session journal + notable trades
├── usage.md           # Token spend tracking
├── strategy.md        # Trading philosophy and rules (evolves)
├── agent.py           # The trading agent (claude-agent-sdk)
├── EXTERNAL-CHANGES.md # Code changes outside this folder
├── MIGRATIONS.md      # Database/third-party changes
└── trades/            # Historical trade data (CSV/JSON)
```

---

## 🚦 CURRENT STATUS

**Phase**: Paper Trading (Mode B - RSI-2)
**Capital**: $100,000 paper → ~$98,654 (as of Dec 9)
**Strategy**: Larry Connors RSI-2 Mean Reversion
**P&L**: -$1,346 (-1.35%)

**Open Positions** (as of last session):
- AVAX/USD: 1,694.6 units
- COIN: 72.8 shares
- ETH/USD: 7.2 units
- SOL/USD: 178.0 units

---

## 📝 NEXT STEPS

1. [ ] Define agent persona (name, color, philosophy)
2. [ ] Set up Alpaca account + API keys (human task)
3. [ ] Create `agent.py` scaffold
4. [ ] Define initial strategy in `strategy.md`
5. [ ] Run first paper trades
6. [ ] Iterate on strategy based on results
7. [ ] Graduate to real money when criteria met

---

## 🔑 HUMAN TASKS NEEDED

- [ ] Create Alpaca account (https://alpaca.markets)
- [ ] Generate API keys (paper trading mode)
- [ ] Add to environment: `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`

---

*Trading agent. Paper first, then real. Let the market decide.*
